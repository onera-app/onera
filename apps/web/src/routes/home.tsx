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
import { cn } from '@/lib/utils';

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

// Suggested prompts for new users - more conversational
const SUGGESTIONS = [
  { text: 'Help me write a professional email', icon: 'mail' },
  { text: 'Explain a complex topic simply', icon: 'lightbulb' },
  { text: 'Write code for a specific task', icon: 'code' },
  { text: 'Brainstorm creative ideas', icon: 'sparkles' },
];

const IconMap = {
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  code: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  sparkles: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

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
      <div className="flex flex-col h-full bg-white dark:bg-gray-950">
        {/* Header */}
        <header className="flex items-center justify-center p-4 border-b border-gray-100 dark:border-gray-800/50">
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
        <div className="p-4 bg-white dark:bg-gray-950">
          {isStreaming ? (
            <div className="flex items-center justify-center gap-4 py-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Generating response...</span>
              <button
                onClick={handleStopStreaming}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-xl',
                  'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
                  'hover:bg-gray-800 dark:hover:bg-gray-200',
                  'transition-colors shadow-soft-sm'
                )}
              >
                Stop
              </button>
            </div>
          ) : (
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating}
              placeholder="Message Cortex..."
            />
          )}
        </div>
      </div>
    );
  }

  // Show welcome screen - Claude-inspired design
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Minimal header with model selector */}
      <header className="flex items-center justify-center p-4">
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </header>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        <div className="w-full max-w-2xl">
          {/* Brand mark */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 mb-5 shadow-soft rotate-3">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-medium text-gray-900 dark:text-white mb-3 tracking-tight">
              What can I help with?
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              Your conversations are end-to-end encrypted
            </p>
          </div>

          {/* No connections warning */}
          {!hasAnyConnections && isUnlocked && (
            <div className="mb-8 p-4 bg-warning/5 border border-warning/20 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    No API Keys Connected
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Add an API key to start chatting with AI models.
                  </p>
                  <Link
                    to="/workspace/connections"
                    className="inline-flex items-center gap-1.5 mt-2.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors"
                  >
                    Add API Key
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Message input - prominent */}
          <div className="mb-8">
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating || !hasAnyConnections}
              placeholder={
                !isUnlocked
                  ? 'Unlock E2EE to start chatting'
                  : !hasAnyConnections
                  ? 'Add an API key to start chatting'
                  : !selectedModelId
                  ? 'Select a model above to start'
                  : 'Message Cortex...'
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
                  className={cn(
                    'inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl',
                    'text-sm text-gray-600 dark:text-gray-300',
                    'bg-gray-50 dark:bg-gray-900',
                    'border border-gray-200 dark:border-gray-700/50',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'hover:border-gray-300 dark:hover:border-gray-600',
                    'transition-all duration-150',
                    'animate-in fade-in-up',
                    index === 0 && 'stagger-1',
                    index === 1 && 'stagger-2',
                    index === 2 && 'stagger-3',
                    index === 3 && 'stagger-4'
                  )}
                >
                  <span className="text-gray-400 dark:text-gray-500">
                    {IconMap[suggestion.icon as keyof typeof IconMap]}
                  </span>
                  <span>{suggestion.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - minimal */}
      <footer className="p-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          End-to-end encrypted
        </p>
      </footer>
    </div>
  );
}
