import { useEffect, useMemo, useCallback, useState } from "react";
import { useParams, useNavigate, useSearch } from "@tanstack/react-router";
import { useLocalRuntime, AssistantRuntimeProvider, WebSpeechSynthesisAdapter } from "@assistant-ui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";

import { useE2EE } from "@/providers/E2EEProvider";
import { useModelStore } from "@/stores/modelStore";
import { useUpdateChat } from "@/hooks/queries/useChats";
import { trpc } from "@/lib/trpc";
import { decryptChatContent } from "@onera/crypto";

import { createChatModelAdapter } from "@/lib/ai/chat-model-adapter";
import { OneraAttachmentAdapter } from "@/lib/ai/attachment-adapter";
import { GoogleSearchToolUI, WebSearchToolUI } from "@/components/assistant-ui/tool-uis";
import { useThreadPersistence } from "@/hooks/useThreadPersistence";
import { useSidebarStatusSync } from "@/hooks/useSidebarStatusSync";
import Thread from "@/components/assistant-ui/thread";
import { ChatNavbar } from "@/components/chat/ChatNavbar";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Inner component — must live inside AssistantRuntimeProvider so that
// useSidebarStatusSync (which calls useThreadRuntime) has access to context.
// ---------------------------------------------------------------------------

function ChatInner({ chatId }: { chatId: string }) {
  useSidebarStatusSync(chatId);
  return (
    <>
      <GoogleSearchToolUI />
      <WebSearchToolUI />
      <Thread />
    </>
  );
}

// ---------------------------------------------------------------------------
// ChatPage — thin orchestrator
// ---------------------------------------------------------------------------

export function ChatPage() {
  const { chatId } = useParams({ strict: false });
  const { pending } = useSearch({ strict: false }) as { pending?: boolean };
  const navigate = useNavigate();
  const { isUnlocked } = useE2EE();
  const { selectedModelId, setSelectedModel } = useModelStore();

  const [decryptAttempt, setDecryptAttempt] = useState(0);

  // ── Data fetching ─────────────────────────────────────────────────────
  const chatQuery = trpc.chats.get.useQuery(
    { chatId: chatId || "" },
    { enabled: !!chatId, placeholderData: (prev) => prev },
  );
  const chat = chatQuery.data;
  const isLoading = chatQuery.isLoading;
  const updateChat = useUpdateChat();

  // ── Billing pre-flight ────────────────────────────────────────────────
  const checkAllowanceMutation =
    trpc.billing.checkInferenceAllowance.useMutation();

  const checkAllowance = useCallback(async () => {
    await checkAllowanceMutation.mutateAsync();
  }, [checkAllowanceMutation]);

  // ── Decryption check ──────────────────────────────────────────────────
  const decryptionError = useMemo(() => {
    if (!chat || !isUnlocked) return null;
    // Force re-evaluation when user clicks "Retry Decrypt"
    void decryptAttempt;
    try {
      decryptChatContent(
        chat.id,
        chat.encryptedChatKey,
        chat.chatKeyNonce,
        chat.encryptedChat,
        chat.chatNonce,
      );
      return null;
    } catch (err) {
      return (
        (err as Error).message ||
        "Unable to decrypt this chat in the current session. Re-unlock encryption or retry."
      );
    }
  }, [chat, isUnlocked, decryptAttempt]);

  // ── Adapter & persistence ─────────────────────────────────────────────
  const adapter = useMemo(
    () => createChatModelAdapter({ checkAllowance }),
    [checkAllowance],
  );

  const { historyAdapter, flushPendingSave } = useThreadPersistence({
    chatId: chatId || "",
    chat: chat ?? null,
    updateChat: updateChat.mutateAsync,
    hasAutoTitle: false,
  });

  // ── Attachment, speech & feedback adapters ────────────────────────────
  const attachmentAdapter = useMemo(() => new OneraAttachmentAdapter(), []);

  const speechAdapter = useMemo(
    () => new WebSpeechSynthesisAdapter(),
    [],
  );

  const feedbackAdapter = useMemo(
    () => ({
      submit: ({ message, type }: { message: unknown; type: "positive" | "negative" }) => {
        // TODO: persist feedback to server when feedback API is ready
        console.log("[feedback]", type, message);
      },
    }),
    [],
  );

  // ── Runtime ───────────────────────────────────────────────────────────
  const runtime = useLocalRuntime(adapter, {
    adapters: { history: historyAdapter, attachments: attachmentAdapter, speech: speechAdapter, feedback: feedbackAdapter },
  });

  // ── Side-effects ──────────────────────────────────────────────────────

  // Clear ?pending search param after navigation
  useEffect(() => {
    if (pending && chatId) {
      navigate({
        to: "/app/c/$chatId",
        params: { chatId },
        search: { pending: false },
        replace: true,
      });
    }
  }, [pending, chatId, navigate]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => flushPendingSave();
  }, [flushPendingSave]);

  // ── Navbar model selector (memoized before early returns) ─────────────
  const navbarChildren = useMemo(
    () => (
      <ModelSelector
        value={selectedModelId || ""}
        onChange={setSelectedModel}
      />
    ),
    [selectedModelId, setSelectedModel],
  );

  // ── Early returns: loading, not found, decryption error ───────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <Spinner size="lg" className="text-gray-500 dark:text-gray-400" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <div className="text-center max-w-md px-4">
          <Alert
            variant="destructive"
            className="bg-gray-50 dark:bg-gray-850 border-gray-100 dark:border-gray-850"
          >
            <HugeiconsIcon icon={Alert01Icon} className="h-4 w-4" />
            <AlertTitle className="text-gray-900 dark:text-gray-100">
              Chat not found
            </AlertTitle>
            <AlertDescription className="text-gray-500 dark:text-gray-400">
              This conversation may have been deleted or doesn&apos;t exist.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <AssistantRuntimeProvider key={chatId} runtime={runtime}>
      <div className="relative flex flex-col h-full w-full min-w-0 overflow-hidden">
        {/* Chat header */}
        <ChatNavbar chatId={chatId || ""}>{navbarChildren}</ChatNavbar>

        {decryptionError && (
          <div className="px-4 pt-16 sm:px-6">
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <HugeiconsIcon
                icon={Alert01Icon}
                className="h-4 w-4 text-amber-500"
              />
              <AlertTitle className="text-gray-900 dark:text-gray-100">
                Couldn&apos;t decrypt conversation
              </AlertTitle>
              <AlertDescription className="text-gray-500 dark:text-gray-400 flex items-center justify-between gap-3">
                <span>{decryptionError}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDecryptAttempt((prev) => prev + 1)}
                >
                  Retry Decrypt
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Thread (includes messages + composer) */}
        <div className="relative flex-1 w-full h-full min-w-0 overflow-hidden">
          <ChatInner chatId={chatId || ""} />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
