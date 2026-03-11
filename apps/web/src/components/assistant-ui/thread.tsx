/**
 * Main Thread component for assistant-ui
 *
 * Composes ThreadPrimitive.Root, Viewport, Messages, ScrollToBottom,
 * and the custom Composer, UserMessage, and AssistantMessage components.
 */

import { type FC, memo, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import {
  ThreadPrimitive,
  useComposerRuntime,
  useMessage,
} from "@assistant-ui/react";

import { cn } from "@/lib/utils";
import AssistantMessage from "./assistant-message";
import UserMessage, { UserEditComposer } from "./user-message";
import Composer from "./composer";
import { FollowUps } from "@/components/chat/FollowUps";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useModelStore } from "@/stores/modelStore";
import { analytics } from "@/lib/analytics";

// ---------------------------------------------------------------------------
// Welcome state (shown when thread is empty)
// ---------------------------------------------------------------------------

const ThreadWelcome: FC = () => {
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Welcome to Onera
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a model and start chatting. Your messages are end-to-end encrypted.
        </p>
        <div className="flex justify-center pt-2">
          <ModelSelector
            value={selectedModelId ?? ""}
            onChange={setSelectedModel}
          />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Follow-ups (rendered after the last assistant message)
// ---------------------------------------------------------------------------

const ThreadFollowUps: FC = () => {
  const composerRuntime = useComposerRuntime();
  const message = useMessage();
  const followUps = (message.metadata?.custom?.followUps ?? []) as string[];

  const handleSelect = useCallback(
    (text: string) => {
      analytics.chat.followUpClicked();
      composerRuntime.setText(text);
      composerRuntime.send();
    },
    [composerRuntime],
  );

  if (followUps.length === 0) return null;

  return (
    <div className="mt-3 max-w-5xl mx-auto px-4 sm:px-5 md:px-6">
      <FollowUps followUps={followUps} onSelect={handleSelect} />
    </div>
  );
};

/**
 * Wrapper that renders follow-ups only after the last assistant message.
 * Uses MessagePrimitive.If-like logic via useMessage().isLast.
 */
const LastMessageFollowUps: FC = () => {
  const { isLast, role } = useMessage();
  if (!isLast || role !== "assistant") return null;
  return <ThreadFollowUps />;
};

// ---------------------------------------------------------------------------
// Scroll-to-bottom button
// ---------------------------------------------------------------------------

const ScrollToBottomButton: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <button
        type="button"
        className={cn(
          "absolute bottom-24 left-1/2 -translate-x-1/2 z-10",
          "flex items-center justify-center",
          "h-8 w-8 rounded-full shadow-md",
          "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
          "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
          "transition-all hover:shadow-lg",
        )}
      >
        <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4" />
      </button>
    </ThreadPrimitive.ScrollToBottom>
  );
};

// ---------------------------------------------------------------------------
// Custom AssistantMessage wrapper that appends follow-ups
// ---------------------------------------------------------------------------

const AssistantMessageWithFollowUps: FC = () => {
  return (
    <>
      <AssistantMessage />
      <LastMessageFollowUps />
    </>
  );
};

// ---------------------------------------------------------------------------
// Main Thread component
// ---------------------------------------------------------------------------

const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full relative">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto chat-scrollbar">
        <ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>

        <div className="pt-20 pb-36 sm:pb-40">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage: AssistantMessageWithFollowUps,
              EditComposer: UserEditComposer,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Composer pinned to bottom of the flex container, outside the scroll viewport */}
      <div
        className={cn(
          "z-20 w-full",
          // Mobile: glassmorphism
          "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3",
          // Desktop: transparent
          "sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:px-6 sm:pb-6 sm:pt-0",
        )}
      >
        <div className="max-w-5xl mx-auto w-full">
          <Composer />
        </div>
      </div>

      <ScrollToBottomButton />
    </ThreadPrimitive.Root>
  );
};

export default memo(Thread);
