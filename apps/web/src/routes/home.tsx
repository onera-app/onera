import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { UIMessage } from 'ai';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useCreateChat } from '@/hooks/queries/useChats';
import { useCredentials } from '@/hooks/queries/useCredentials';
import { createEncryptedChat } from '@onera/crypto';
import type { ChatMessage } from '@onera/types';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { Messages } from '@/components/chat/Messages';
import { useDirectChat } from '@/hooks/useDirectChat';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Sparkles, Lock, AlertTriangle, Mail, Lightbulb, Code, ArrowRight } from 'lucide-react';

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
  { text: 'Help me write a professional email', icon: Mail },
  { text: 'Explain a complex topic simply', icon: Lightbulb },
  { text: 'Write code for a specific task', icon: Code },
  { text: 'Brainstorm creative ideas', icon: Sparkles },
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
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <header className="flex items-center justify-center p-4 border-b border-border">
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
        <div className="p-4 bg-background">
          {isStreaming ? (
            <div className="flex items-center justify-center gap-4 py-2">
              <span className="text-sm text-muted-foreground">Generating response...</span>
              <Button onClick={handleStopStreaming}>
                Stop
              </Button>
            </div>
          ) : (
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating}
              placeholder="Message Onera..."
            />
          )}
        </div>
      </div>
    );
  }

  // Show welcome screen
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Minimal header with model selector */}
      <header className="flex items-center justify-center p-4">
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </header>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        <div className="w-full max-w-2xl">
          {/* Brand mark */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5 shadow-sm rotate-3">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold mb-3 tracking-tight">
              What can I help with?
            </h1>
            <p className="text-muted-foreground text-base">
              Your conversations are end-to-end encrypted
            </p>
          </div>

          {/* No connections warning */}
          {!hasAnyConnections && isUnlocked && (
            <Alert className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No API Keys Connected</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>Add an API key to start chatting with AI models.</span>
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link to="/workspace/connections" className="flex items-center gap-1">
                    Add API Key <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
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
                  : 'Message Onera...'
              }
            />
          </div>

          {/* Suggestion chips */}
          {hasAnyConnections && selectedModelId && isUnlocked && (
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={() => handleSendMessage(suggestion.text)}
                    className={cn(
                      'animate-in fade-in-up',
                      index === 0 && 'stagger-1',
                      index === 1 && 'stagger-2',
                      index === 2 && 'stagger-3',
                      index === 3 && 'stagger-4'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {suggestion.text}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - minimal */}
      <footer className="p-4 text-center">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          End-to-end encrypted
        </p>
      </footer>
    </div>
  );
}
