import { useRef, useCallback, useMemo } from "react";
import type { ThreadHistoryAdapter, ExportedMessageRepositoryItem } from "@assistant-ui/react";
import type { ChatHistory } from "@onera/types";
import {
  chatHistoryToExportedRepository,
  addThreadMessageToHistory,
} from "@/lib/ai/message-converter";
import { createMessagesList } from "@/lib/messageTree";
import {
  encryptChatContent,
  encryptChatTitle,
  decryptChatContent,
} from "@onera/crypto";
import { generateChatTitle, generateFollowUps } from "@/lib/ai/tasks";
import { useModelStore } from "@/stores/modelStore";

interface UseThreadPersistenceOptions {
  chatId: string;
  chat: {
    id: string;
    encryptedChat: string;
    chatNonce: string;
    encryptedTitle: string;
    titleNonce: string;
    encryptedChatKey: string;
    chatKeyNonce: string;
  } | null;
  updateChat: (params: {
    id: string;
    data: {
      encryptedChat?: string;
      chatNonce?: string;
      encryptedTitle?: string;
      titleNonce?: string;
    };
  }) => Promise<unknown>;
  hasAutoTitle: boolean;
}

const DEBOUNCE_MS = 1000;

const EMPTY_HISTORY: ChatHistory = { currentId: null, messages: {} };

/**
 * Adapts a ThreadMessage from assistant-ui into the shape expected by
 * addThreadMessageToHistory (which predates the assistant-ui types).
 */
function threadMessageToConverterShape(message: ExportedMessageRepositoryItem["message"]) {
  const content: Array<{ type: string; text?: string; image?: string }> = [];
  for (const part of message.content) {
    if (part.type === "text") {
      content.push({ type: "text", text: part.text });
    } else if (part.type === "image") {
      content.push({ type: "image", image: part.image });
    }
  }

  return {
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    content,
    createdAt: message.createdAt,
    metadata: message.metadata
      ? {
          custom: message.metadata.custom as
            | { model?: string; followUps?: string[] }
            | undefined,
        }
      : undefined,
  };
}

export function useThreadPersistence({
  chatId,
  chat,
  updateChat,
  hasAutoTitle,
}: UseThreadPersistenceOptions): {
  historyAdapter: ThreadHistoryAdapter;
  flushPendingSave: () => void;
} {
  const historyRef = useRef<ChatHistory>(EMPTY_HISTORY);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleGeneratedRef = useRef(false);

  // ── helpers ────────────────────────────────────────────────────────────

  const flushSave = useCallback(async () => {
    if (!chat) return;

    const { encryptedChat, chatNonce } = encryptChatContent(
      chatId,
      chat.encryptedChatKey,
      chat.chatKeyNonce,
      historyRef.current as unknown as Record<string, unknown>,
    );

    await updateChat({
      id: chatId,
      data: { encryptedChat, chatNonce },
    });
  }, [chatId, chat, updateChat]);

  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushSave();
    }, DEBOUNCE_MS);
  }, [flushSave]);

  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      // fire-and-forget – React cleanup cannot await
      void flushSave();
    }
  }, [flushSave]);

  // ── title generation (fire-and-forget) ─────────────────────────────────

  const maybeGenerateTitle = useCallback(
    (history: ChatHistory) => {
      if (!chat || !hasAutoTitle || titleGeneratedRef.current) return;
      titleGeneratedRef.current = true;

      const modelId = useModelStore.getState().selectedModelId;
      if (!modelId) return;

      const messages = createMessagesList(history);

      void generateChatTitle(messages, modelId).then((title) => {
        if (!title) return;

        const { encryptedTitle, titleNonce } = encryptChatTitle(
          chatId,
          chat.encryptedChatKey,
          chat.chatKeyNonce,
          title,
        );

        void updateChat({
          id: chatId,
          data: { encryptedTitle, titleNonce },
        });
      });
    },
    [chatId, chat, hasAutoTitle, updateChat],
  );

  // ── follow-up generation (fire-and-forget) ─────────────────────────────

  const maybeGenerateFollowUps = useCallback(
    (history: ChatHistory, messageId: string) => {
      if (!chat) return;

      const modelId = useModelStore.getState().selectedModelId;
      if (!modelId) return;

      const messages = createMessagesList(history);

      void generateFollowUps(messages, modelId).then((followUps) => {
        if (!followUps.length) return;

        // Update the shadow tree message in-place with follow-ups
        const msg = historyRef.current.messages[messageId];
        if (msg) {
          historyRef.current = {
            ...historyRef.current,
            messages: {
              ...historyRef.current.messages,
              [messageId]: { ...msg, followUps },
            },
          };
          scheduleSave();
        }
      });
    },
    [chat, scheduleSave],
  );

  // ── ThreadHistoryAdapter ──────────────────────────────────────────────

  const historyAdapter = useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        if (!chat) {
          historyRef.current = EMPTY_HISTORY;
          return { headId: null, messages: [] };
        }

        const decrypted = decryptChatContent(
          chatId,
          chat.encryptedChatKey,
          chat.chatKeyNonce,
          chat.encryptedChat,
          chat.chatNonce,
        ) as unknown as ChatHistory;

        historyRef.current = decrypted;

        // Convert the full tree (all branches) to ExportedMessageRepository
        // so that assistant-ui can reconstruct the branch structure on load.
        return chatHistoryToExportedRepository(decrypted);
      },

      async append(item: ExportedMessageRepositoryItem) {
        const converted = threadMessageToConverterShape(item.message);

        historyRef.current = addThreadMessageToHistory(
          historyRef.current,
          converted,
          item.parentId,
        );

        scheduleSave();

        // Side-effects for assistant messages
        if (item.message.role === "assistant") {
          maybeGenerateTitle(historyRef.current);
          maybeGenerateFollowUps(historyRef.current, item.message.id);
        }
      },
    }),
    [chatId, chat, scheduleSave, maybeGenerateTitle, maybeGenerateFollowUps],
  );

  return { historyAdapter, flushPendingSave };
}
