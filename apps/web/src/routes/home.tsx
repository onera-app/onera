import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { useE2EE } from "@/providers/E2EEProvider";
import { useModelStore } from "@/stores/modelStore";
import { useUIStore } from "@/stores/uiStore";
import { useCreateChat } from "@/hooks/queries/useChats";
import { trpc } from "@/lib/trpc";
import { useCredentials } from "@/hooks/queries/useCredentials";
import { createEncryptedChat } from "@onera/crypto";
import type { ChatMessage, ChatHistory } from "@onera/types";
import { MessageInput } from "@/components/chat/MessageInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Lock, AlertTriangle, ArrowRight, Menu } from "lucide-react";

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
  const {
    data: privateModels,
    isLoading: loadingPrivateModels,
    isFetching: fetchingPrivateModels,
  } = trpc.enclaves.listModels.useQuery(undefined, { enabled: isUnlocked });
  const hasPrivateModels = privateModels && privateModels.length > 0;

  const privateModelsQueryPending =
    !isUnlocked || loadingPrivateModels || fetchingPrivateModels;

  const canChat = useMemo(() => {
    return hasAnyConnections || hasPrivateModels;
  }, [hasAnyConnections, hasPrivateModels]);

  const isLoading = isLoadingCredentials || privateModelsQueryPending;

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!isUnlocked) {
        toast.error("Please unlock E2EE first");
        return;
      }

      if (!selectedModelId) {
        toast.error("Please select a model first");
        return;
      }

      if (!canChat) {
        toast.error("No models available");
        return;
      }

      if (isLoading) {
        toast.error("Loading...");
        return;
      }

      setIsCreating(true);

      try {
        const userMessageId = uuidv4();
        const userMessage: ChatMessage = {
          id: userMessageId,
          role: "user",
          content: content,
          created_at: Date.now(),
          parentId: null,
          childrenIds: [],
        };

        const history: ChatHistory = {
          currentId: userMessageId,
          messages: {
            [userMessageId]: userMessage,
          },
        };

        const initialTitle = "New Chat";

        const { data: encryptedData } = await createEncryptedChat(
          initialTitle,
          history as unknown as Record<string, unknown>,
        );

        const createdChat = await createChat.mutateAsync({
          encryptedChatKey: encryptedData.encryptedChatKey,
          chatKeyNonce: encryptedData.chatKeyNonce,
          encryptedTitle: encryptedData.encryptedTitle,
          titleNonce: encryptedData.titleNonce,
          encryptedChat: encryptedData.encryptedChat,
          chatNonce: encryptedData.chatNonce,
        });

        utils.chats.get.setData({ chatId: createdChat.id }, createdChat);

        navigate({
          to: "/app/c/$chatId",
          params: { chatId: createdChat.id },
          search: { pending: true },
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create chat",
        );
        setIsCreating(false);
      }
    },
    [
      canChat,
      isLoading,
      isUnlocked,
      selectedModelId,
      createChat,
      navigate,
      utils,
    ],
  );

  return (
    <div className="relative flex flex-col h-full w-full min-w-0 overflow-x-hidden bg-white dark:bg-gray-900">
      {/* Minimal header with model selector */}
      <header className="absolute top-[1px] z-10 left-1/2 -translate-x-1/2 sm:left-4 sm:right-4 sm:translate-x-0 flex items-center gap-2 sm:gap-3 px-2 sm:px-3 h-12 w-fit max-w-[calc(100vw-1.5rem)] sm:w-auto">
        {/* Menu button - visible when sidebar is closed */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-850 rounded-xl transition-colors flex-shrink-0"
          >
            <Menu className="h-[18px] w-[18px]" />
          </Button>
        )}

        <ModelSelector
          value={selectedModelId || ""}
          onChange={setSelectedModel}
        />
      </header>

      {/* Centered welcome content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-14 sm:pt-12 min-w-0 w-full">
        <div className="w-full max-w-3xl min-w-0">
          {/* Brand mark */}
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-3xl font-primary font-semibold tracking-[-0.02em] mb-2 sm:mb-3 text-gray-900 dark:text-gray-100">
              What can I help with?
            </h1>
            <p className="text-gray-500 dark:text-gray-500 text-sm sm:text-base leading-relaxed">
              Your conversations are end-to-end encrypted
            </p>
          </div>

          {/* No connections warning */}
          {!canChat && !isLoading && isUnlocked && (
            <Alert className="mb-6 sm:mb-8 border-gray-100 dark:border-gray-850 rounded-2xl bg-gray-50 dark:bg-gray-850">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                No Models Available
              </AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-gray-600 dark:text-gray-400 text-sm sm:text-sm">
                <span>Add an API key to start chatting with AI models.</span>
                <Button
                  variant="link"
                  className="p-0 h-auto flex items-center gap-1 text-gray-900 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white self-start sm:self-auto transition-colors"
                  onClick={() => openSettingsModal("connections")}
                >
                  Add API Key <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Message input */}
          <div>
            <MessageInput
              onSend={handleSendMessage}
              disabled={!isUnlocked || isCreating || !canChat || isLoading}
              placeholder={
                !isUnlocked
                  ? "Unlock E2EE to start chatting"
                  : isLoading
                    ? "Loading models..."
                    : !canChat
                      ? "Add an API key to start chatting"
                      : !selectedModelId
                        ? "Select a model above to start"
                        : "Message..."
              }
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-4 sm:py-5 text-center w-full">
        <p className="text-xs text-gray-500 text-center line-clamp-1 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3" />
          End-to-end encrypted
        </p>
      </footer>
    </div>
  );
}
