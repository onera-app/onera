import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useAuthStore } from '@/stores/authStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { createChat } from '@/lib/api/chats';
import { createEncryptedChat } from '@cortex/crypto';
import type { ChatMessage } from '@cortex/types';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { Messages } from '@/components/chat/Messages';
import { hasConnections } from '@/lib/ai';
import { useDirectChat } from '@/hooks/useDirectChat';

/**
 * Convert UIMessage (AI SDK format) to ChatMessage (storage format)
 */
function toChatMessage(msg: UIMessage, model?: string): ChatMessage {
  let content = '';
  if (msg.parts) {
    for (const part of msg.parts) {
      if (part.type === 'text') {
        content += part.text;
      }
    }
  }

  return {
    id: msg.id,
    role: msg.role,
    content,
    created_at: Date.now(),
    model: msg.role === 'assistant' ? model : undefined,
  };
}

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();

  const [isCreating, setIsCreating] = useState(false);
  const pendingNavigateRef = useRef<string | null>(null);

  // Check if user has connections
  const { data: hasAnyConnections = false } = useQuery({
    queryKey: ['hasConnections'],
    queryFn: () => hasConnections(token!),
    enabled: !!token,
    staleTime: 30000,
  });

  // Handle message completion - create chat and navigate
  // Note: Actual chat creation is handled in the useEffect below
  // to ensure we have access to the complete messages array
  const handleFinish = useCallback(async (_message: UIMessage) => {
    // Chat creation handled in useEffect to access full messages array
  }, []);

  // Use the direct chat hook with a temporary ID for new chats
  const {
    messages: aiMessages,
    sendMessage,
    status,
    stop,
    isReady,
    isLoadingCredentials,
    setMessages,
  } = useDirectChat({
    chatId: 'new-chat',
    onFinish: handleFinish,
    onError: (error) => {
      if (error.name !== 'AbortError') {
        toast.error(error.message || 'Failed to get response');
      }
      setIsCreating(false);
    },
  });

  // Derive streaming state from AI SDK status
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Convert AI SDK messages to ChatMessage format for display
  const displayMessages = useMemo(() => {
    return aiMessages.map(msg => toChatMessage(msg, selectedModelId || undefined));
  }, [aiMessages, selectedModelId]);

  // Get streaming content from the last message if it's streaming
  const streamingContent = useMemo(() => {
    if (!isStreaming) return undefined;

    const lastMessage = aiMessages[aiMessages.length - 1];
    if (lastMessage?.role === 'assistant') {
      let content = '';
      if (lastMessage.parts) {
        for (const part of lastMessage.parts) {
          if (part.type === 'text') {
            content += part.text;
          }
        }
      }
      return content;
    }
    return '';
  }, [aiMessages, isStreaming]);

  // Monitor for completion and create chat
  useEffect(() => {
    const createAndNavigate = async () => {
      // Only proceed when streaming is done and we have messages
      if (isStreaming || aiMessages.length < 2 || !isCreating || !token) {
        return;
      }

      // Check if we have both user and assistant messages
      const hasUser = aiMessages.some(m => m.role === 'user');
      const hasAssistant = aiMessages.some(m => m.role === 'assistant');

      if (!hasUser || !hasAssistant || pendingNavigateRef.current) {
        return;
      }

      // Convert all messages to storage format
      const finalMessages = aiMessages.map(msg => toChatMessage(msg, selectedModelId || undefined));

      // Use first user message as initial title (fast)
      const firstUserMsg = finalMessages.find(m => m.role === 'user');
      const content = firstUserMsg?.content || 'New Chat';
      const initialTitle = (typeof content === 'string' ? content : 'New Chat').slice(0, 50) +
        ((typeof content === 'string' ? content : '').length > 50 ? '...' : '');

      try {
        // Encrypt the chat with all messages
        const { chatId, data: encryptedData } = await createEncryptedChat(initialTitle, {
          messages: finalMessages,
        });

        // Mark as pending to prevent double creation
        pendingNavigateRef.current = chatId;

        // Save to server
        await createChat(token, {
          id: chatId,
          encrypted_chat_key: encryptedData.encryptedChatKey,
          chat_key_nonce: encryptedData.chatKeyNonce,
          encrypted_title: encryptedData.encryptedTitle,
          title_nonce: encryptedData.titleNonce,
          encrypted_chat: encryptedData.encryptedChat,
          chat_nonce: encryptedData.chatNonce,
        });

        // Invalidate chats query to update sidebar
        queryClient.invalidateQueries({ queryKey: ['chats'] });

        // Navigate to the chat
        navigate({ to: '/c/$chatId', params: { chatId } });
      } catch (err) {
        pendingNavigateRef.current = null;
        toast.error(err instanceof Error ? err.message : 'Failed to create chat');
        setIsCreating(false);
      }
    };

    createAndNavigate();
  }, [aiMessages, isStreaming, isCreating, token, selectedModelId, navigate, queryClient]);

  // Reset state when needed
  useEffect(() => {
    return () => {
      pendingNavigateRef.current = null;
    };
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!isUnlocked || !token) {
      toast.error('Please unlock E2EE first');
      return;
    }

    if (!selectedModelId) {
      toast.error('Please select a model first');
      return;
    }

    if (!hasAnyConnections) {
      toast.error('Please add a connection first');
      return;
    }

    if (!isReady) {
      if (isLoadingCredentials) {
        toast.error('Loading credentials...');
      } else {
        toast.error('Please add a connection first');
      }
      return;
    }

    setIsCreating(true);
    pendingNavigateRef.current = null;

    // Clear any previous messages
    setMessages([]);

    // Send to AI via the hook
    try {
      await sendMessage(content);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Failed to send message');
        setIsCreating(false);
      }
    }
  }, [hasAnyConnections, isLoadingCredentials, isReady, isUnlocked, selectedModelId, sendMessage, setMessages, token]);

  const handleStopStreaming = useCallback(() => {
    stop();
    setIsCreating(false);
  }, [stop]);

  // Show streaming UI if we have messages
  if (displayMessages.length > 0 || isStreaming) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-semibold">New Chat</h1>
          <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <Messages
            messages={displayMessages.filter(m => m.role === 'user')}
            streamingMessage={streamingContent}
            isStreaming={isStreaming}
          />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          {isStreaming ? (
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-gray-500">Generating response...</span>
              <button
                onClick={handleStopStreaming}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Stop
              </button>
            </div>
          ) : (
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating}
              placeholder="Send a message..."
            />
          )}
        </div>
      </div>
    );
  }

  // Show welcome screen
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-semibold">New Chat</h1>
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </header>

      {/* Welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Cortex
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Your conversations are end-to-end encrypted. Start a new chat below.
          </p>

          {/* No connections warning */}
          {!hasAnyConnections && isUnlocked && (
            <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                    No LLM Connections
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You need to add at least one LLM provider connection to start chatting.
                  </p>
                  <Link
                    to="/workspace/connections"
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline"
                  >
                    Add Connection
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold mb-1">E2E Encrypted</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your chats are encrypted before leaving your device
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-2xl mb-2">🔗</div>
              <h3 className="font-semibold mb-1">Direct Connection</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect directly to LLM providers - no middleman
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="text-2xl mb-2">🔑</div>
              <h3 className="font-semibold mb-1">Your Keys</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Use your own API keys stored encrypted locally
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <MessageInput
          onSend={handleSendMessage}
          disabled={!isUnlocked || isCreating || !hasAnyConnections}
          placeholder={
            !isUnlocked
              ? 'Unlock E2EE to start chatting'
              : !hasAnyConnections
              ? 'Add a connection to start chatting'
              : !selectedModelId
              ? 'Select a model to start chatting'
              : 'Send a message to start a new chat...'
          }
        />
      </div>
    </div>
  );
}
