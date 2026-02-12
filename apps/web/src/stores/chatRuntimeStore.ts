import { create } from "zustand";

export type ChatRuntimeStatus =
  | "idle"
  | "queued"
  | "streaming"
  | "persisting"
  | "error";

interface ChatRuntimeState {
  byChatId: Record<string, ChatRuntimeStatus>;
  setStatus: (chatId: string, status: ChatRuntimeStatus) => void;
  clearChat: (chatId: string) => void;
}

export const useChatRuntimeStore = create<ChatRuntimeState>((set) => ({
  byChatId: {},
  setStatus: (chatId, status) =>
    set((state) => ({
      byChatId: {
        ...state.byChatId,
        [chatId]: status,
      },
    })),
  clearChat: (chatId) =>
    set((state) => {
      const next = { ...state.byChatId };
      delete next[chatId];
      return { byChatId: next };
    }),
}));

