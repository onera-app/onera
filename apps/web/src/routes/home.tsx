import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useE2EE } from '@/providers/E2EEProvider';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { useCreateChat } from '@/hooks/queries/useChats';
import { trpc } from '@/lib/trpc';
import { useCredentials } from '@/hooks/queries/useCredentials';
import { createEncryptedChat } from '@onera/crypto';
import type { ChatMessage, ChatHistory } from '@onera/types';
import { MessageInput } from '@/components/chat/MessageInput';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Lock, AlertTriangle, Mail, Lightbulb, Code, Sparkles, ArrowRight, Menu } from 'lucide-react';

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
  const { openSettingsModal, sidebarOpen, toggleSidebar } = useUIStore();
  const { selectedModelId, setSelectedModel } = useModelStore();
  const createChat = useCreateChat();
  const utils = trpc.useUtils();

  const [isCreating, setIsCreating] = useState(false);

  // Check if user has connections or private models
  const credentials = useCredentials();
  const hasAnyConnections = credentials && credentials.length > 0;
  const isLoadingCredentials = credentials === undefined;

  // Fetch private models
  const { data: privateModels, isLoading: loadingPrivateModels } = trpc.enclaves.listModels.useQuery(
    undefined,
    { enabled: isUnlocked }
  );
  const hasPrivateModels = privateModels && privateModels.length > 0;

  // User can chat if they have connections OR private models
  const canChat = useMemo(() => {
    return hasAnyConnections || hasPrivateModels;
  }, [hasAnyConnections, hasPrivateModels]);

  const isLoading = isLoadingCredentials || loadingPrivateModels;

  const handleSendMessage = useCallback(async (content: string) => {
    if (!isUnlocked) {
      toast.error('Please unlock E2EE first');
      return;
    }

    if (!selectedModelId) {
      toast.error('Please select a model first');
      return;
    }

    if (!canChat) {
      toast.error('No models available');
      return;
    }

    if (isLoading) {
      toast.error('Loading...');
      return;
    }

    setIsCreating(true);

    try {
      // Create user message
      const userMessageId = uuidv4();
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: content,
        created_at: Date.now(),
        parentId: null,
        childrenIds: [],
      };

      // Build ChatHistory with just the user message
      const history: ChatHistory = {
        currentId: userMessageId,
        messages: {
          [userMessageId]: userMessage,
        },
      };

      // Generate initial title from user message
      const initialTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');

      // Encrypt and create chat
      const { data: encryptedData } = await createEncryptedChat(
        initialTitle,
        history as unknown as Record<string, unknown>
      );

      const createdChat = await createChat.mutateAsync({
        encryptedChatKey: encryptedData.encryptedChatKey,
        chatKeyNonce: encryptedData.chatKeyNonce,
        encryptedTitle: encryptedData.encryptedTitle,
        titleNonce: encryptedData.titleNonce,
        encryptedChat: encryptedData.encryptedChat,
        chatNonce: encryptedData.chatNonce,
      });

      // Pre-populate the cache to avoid loading state on chat page
      utils.chats.get.setData({ chatId: createdChat.id }, createdChat);

      // Navigate to chat page with pending flag to trigger AI response
      navigate({
        to: '/app/c/$chatId',
        params: { chatId: createdChat.id },
        search: { pending: true },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create chat');
      setIsCreating(false);
    }
  }, [canChat, isLoading, isUnlocked, selectedModelId, createChat, navigate, utils]);

  // Show welcome screen
  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-background overflow-x-hidden">
      {/* Minimal header with model selector */}
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 h-14 w-full">
        {/* Menu button - visible when sidebar is closed */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <ModelSelector value={selectedModelId || ''} onChange={setSelectedModel} />
      </header>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 -mt-8 sm:-mt-16 min-w-0 w-full">
        <div className="w-full max-w-2xl min-w-0">
          {/* Brand mark */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 sm:mb-3 text-foreground">
              What can I help with?
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Your conversations are end-to-end encrypted
            </p>
          </div>

          {/* No connections warning - only show if no private models either */}
          {!canChat && !isLoading && isUnlocked && (
            <Alert className="mb-4 sm:mb-6 bg-card border-border">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-foreground text-sm sm:text-base">No Models Available</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-muted-foreground text-sm">
                <span>Add an API key to start chatting with AI models.</span>
                <Button
                  variant="link"
                  className="p-0 h-auto flex items-center gap-1 text-foreground self-start sm:self-auto"
                  onClick={() => openSettingsModal('connections')}
                >
                  Add API Key <ArrowRight className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Message input - prominent */}
          <div className="mb-4 sm:mb-6">
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating || !canChat || isLoading}
              placeholder={
                !isUnlocked
                  ? 'Unlock E2EE to start chatting'
                  : isLoading
                  ? 'Loading models...'
                  : !canChat
                  ? 'Add an API key to start chatting'
                  : !selectedModelId
                  ? 'Select a model above to start'
                  : 'Message...'
              }
            />
          </div>

          {/* Suggestion chips */}
          {canChat && selectedModelId && isUnlocked && !isCreating && (
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
              {SUGGESTIONS.map((suggestion, index) => {
                const Icon = suggestion.icon;
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendMessage(suggestion.text)}
                    disabled={isCreating}
                    className={cn(
                      'bg-transparent border-border text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border/80',
                      'text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3',
                      'animate-in fade-in-up',
                      index === 0 && 'stagger-1',
                      index === 1 && 'stagger-2',
                      index === 2 && 'stagger-3',
                      index === 3 && 'stagger-4'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-muted-foreground" />
                    <span className="hidden xs:inline sm:inline">{suggestion.text}</span>
                    <span className="xs:hidden sm:hidden">{suggestion.text.split(' ').slice(0, 3).join(' ')}...</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer - minimal */}
      <footer className="px-4 py-3 sm:py-4 text-center w-full">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          End-to-end encrypted
        </p>
      </footer>
    </div>
  );
}
