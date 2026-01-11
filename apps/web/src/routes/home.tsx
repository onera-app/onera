import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useCreateChat } from '@/hooks/queries/useChats';
import { useCredentials } from '@/hooks/queries/useCredentials';
import { createEncryptedChat } from '@cortex/crypto';
import type { ChatMessage } from '@cortex/types';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { Messages } from '@/components/chat/Messages';
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

// Suggested prompts for new users
const SUGGESTIONS = [
  { text: 'Help me write a professional email', icon: '✉️' },
  { text: 'Explain a complex topic simply', icon: '💡' },
  { text: 'Write code for a specific task', icon: '💻' },
  { text: 'Brainstorm creative ideas', icon: '🎨' },
];

export function HomePage() {
  const navigate = useNavigate();
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const createChat = useCreateChat();

  const [isCreating, setIsCreating] = useState(false);
  const pendingNavigateRef = useRef<string | null>(null);

  // Check if user has connections using Convex
  const credentials = useCredentials();
  const hasAnyConnections = credentials && credentials.length > 0;

  // Handle message completion
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
      if (isStreaming || aiMessages.length < 2 || !isCreating) {
        return;
      }

      const hasUser = aiMessages.some(m => m.role === 'user');
      const hasAssistant = aiMessages.some(m => m.role === 'assistant');

      if (!hasUser || !hasAssistant || pendingNavigateRef.current) {
        return;
      }

      const finalMessages = aiMessages.map(msg => toChatMessage(msg, selectedModelId || undefined));
      const firstUserMsg = finalMessages.find(m => m.role === 'user');
      const content = firstUserMsg?.content || 'New Chat';
      const initialTitle = (typeof content === 'string' ? content : 'New Chat').slice(0, 50) +
        ((typeof content === 'string' ? content : '').length > 50 ? '...' : '');

      try {
        const { data: encryptedData } = await createEncryptedChat(initialTitle, {
          messages: finalMessages,
        });

        const createdChat = await createChat.mutateAsync({
          encryptedChatKey: encryptedData.encryptedChatKey,
          chatKeyNonce: encryptedData.chatKeyNonce,
          encryptedTitle: encryptedData.encryptedTitle,
          titleNonce: encryptedData.titleNonce,
          encryptedChat: encryptedData.encryptedChat,
          chatNonce: encryptedData.chatNonce,
        });

        pendingNavigateRef.current = createdChat.id;
        navigate({ to: '/c/$chatId', params: { chatId: createdChat.id } });
      } catch (err) {
        pendingNavigateRef.current = null;
        toast.error(err instanceof Error ? err.message : 'Failed to create chat');
        setIsCreating(false);
      }
    };

    createAndNavigate();
  }, [aiMessages, isStreaming, isCreating, selectedModelId, navigate, createChat]);

  // Reset state when needed
  useEffect(() => {
    return () => {
      pendingNavigateRef.current = null;
    };
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!isUnlocked) {
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
    setMessages([]);

    try {
      await sendMessage(content);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(err instanceof Error ? err.message : 'Failed to send message');
        setIsCreating(false);
      }
    }
  }, [hasAnyConnections, isLoadingCredentials, isReady, isUnlocked, selectedModelId, sendMessage, setMessages]);

  const handleStopStreaming = useCallback(() => {
    stop();
    setIsCreating(false);
  }, [stop]);

  // Show streaming UI if we have messages
  if (displayMessages.length > 0 || isStreaming) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-center p-3 border-b border-gray-200 dark:border-gray-800/50">
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-800/50">
          {isStreaming ? (
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-gray-500">Generating response...</span>
              <button
                onClick={handleStopStreaming}
                className="px-4 py-2 text-sm font-medium text-white bg-error rounded-lg hover:bg-error/90 transition-colors"
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

  // Show welcome screen - OpenWebUI/ChatGPT style
  return (
    <div className="flex flex-col h-full">
      {/* Model selector at top center */}
      <header className="flex items-center justify-center p-3">
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </header>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              How can I help you today?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              End-to-end encrypted conversations with AI
            </p>
          </div>

          {/* No connections warning */}
          {!hasAnyConnections && isUnlocked && (
            <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    No LLM Connections
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                    Add a connection to start chatting with AI.
                  </p>
                  <Link
                    to="/workspace/connections"
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-accent hover:underline"
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

          {/* Message input - centered and prominent */}
          <div className="mb-6">
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating || !hasAnyConnections}
              placeholder={
                !isUnlocked
                  ? 'Unlock E2EE to start chatting'
                  : !hasAnyConnections
                  ? 'Add a connection to start chatting'
                  : !selectedModelId
                  ? 'Select a model above to start chatting'
                  : 'Send a message...'
              }
            />
          </div>

          {/* Suggestion chips */}
          {hasAnyConnections && selectedModelId && isUnlocked && (
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(suggestion.text)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span>{suggestion.icon}</span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with E2EE indicator */}
      <footer className="p-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Your conversations are encrypted end-to-end
        </p>
      </footer>
    </div>
  );
}
