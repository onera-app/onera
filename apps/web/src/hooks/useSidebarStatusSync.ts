import { useEffect } from "react";
import { useThreadRuntime } from "@assistant-ui/react";
import { useChatRuntimeStore } from "@/stores/chatRuntimeStore";

/**
 * Syncs assistant-ui's thread running state to chatRuntimeStore
 * for sidebar streaming indicators.
 *
 * Must be rendered inside <AssistantRuntimeProvider>.
 */
export function useSidebarStatusSync(chatId: string) {
  const threadRuntime = useThreadRuntime();
  const setStatus = useChatRuntimeStore((s) => s.setStatus);
  const clearChat = useChatRuntimeStore((s) => s.clearChat);

  useEffect(() => {
    const unsubscribe = threadRuntime.subscribe(() => {
      const state = threadRuntime.getState();
      if (state.isRunning) {
        setStatus(chatId, "streaming");
      } else {
        setStatus(chatId, "idle");
      }
    });

    return () => {
      unsubscribe();
      clearChat(chatId);
    };
  }, [chatId, threadRuntime, setStatus, clearChat]);
}
