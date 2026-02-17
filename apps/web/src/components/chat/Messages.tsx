import { useRef, useEffect, memo, useCallback, useState } from "react";
import { type ChatMessage, type ChatHistory } from "@onera/types";
import {
  UserMessage,
  AssistantMessage,
  type BranchInfo,
  type RegenerateOptions,
} from "./Message";
import { cn } from "@/lib/utils";
import { getMessageText } from "@/lib/chat/messageUtils";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import { getBranchInfo, getSiblings, getDeepestChild } from "@/lib/messageTree";
import type { Source } from "./Sources";

import { FollowUps } from "./FollowUps";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// Custom hook for smooth scroll button visibility with animation
function useScrollButtonVisibility(isAtBottom: boolean) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isAtBottom) {
      // Show button: render first, then animate in
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      // Hide button: animate out first, then remove from DOM
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isAtBottom]);

  return { shouldRender, isVisible };
}

// Custom hook to anchor user message at top when streaming starts
function useStreamingAnchor(
  containerRef: React.RefObject<HTMLDivElement | null>,
  messages: ChatMessage[],
  isStreaming: boolean | undefined,
) {
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const wasStreamingRef = useRef(false);
  const hasAnchoredRef = useRef(false);
  const prevMessageCountRef = useRef(messages.length);

  useEffect(() => {
    const container = containerRef.current;
    const userMessageEl = lastUserMessageRef.current;

    // Capture previous state before updating
    const wasStreaming = wasStreamingRef.current;
    const prevMessageCount = prevMessageCountRef.current;

    // Detect state changes
    const messageCountIncreased = messages.length > prevMessageCount;
    const lastMessage = messages[messages.length - 1];
    const isNewUserMessage =
      messageCountIncreased && lastMessage?.role === "user";
    const streamingJustStarted = isStreaming && !wasStreaming;
    const streamingJustEnded = !isStreaming && wasStreaming;

    // Update refs for next render
    prevMessageCountRef.current = messages.length;
    wasStreamingRef.current = !!isStreaming;

    // Reset anchor flag when streaming ends
    if (streamingJustEnded) {
      hasAnchoredRef.current = false;
      return;
    }

    // Anchor when: new user message added OR streaming just started
    const shouldAnchor =
      (isNewUserMessage || streamingJustStarted) &&
      userMessageEl &&
      container &&
      !hasAnchoredRef.current;

    if (shouldAnchor) {
      hasAnchoredRef.current = true;

      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        if (!container || !userMessageEl) return;

        // Calculate scroll position to show user message at top with padding
        const containerRect = container.getBoundingClientRect();
        const messageRect = userMessageEl.getBoundingClientRect();
        const relativeTop =
          messageRect.top - containerRect.top + container.scrollTop;

        // Position user message with comfortable top padding (accounts for navbar)
        const topPadding = 100;
        const targetScroll = Math.max(0, relativeTop - topPadding);

        // Instant scroll to anchor position (then smooth scroll takes over for streaming)
        container.scrollTop = targetScroll;
      });
    }
  }, [isStreaming, messages, containerRef]);

  return { lastUserMessageRef };
}

// AI SDK message part types - compatible with UIMessagePart
export type ToolInvocationState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export interface ToolInvocationPart {
  type: "tool-invocation";
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  state: ToolInvocationState;
  errorText?: string;
}

export interface SourcePart {
  type: "source";
  source: {
    sourceType?: string;
    url?: string;
    title?: string;
    domain?: string;
  };
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string; providerMetadata?: unknown }
  | ToolInvocationPart
  | SourcePart
  | {
    type: "file";
    data: string;
    mediaType: string;
    url?: string;
    filename?: string;
  }
  // Catch-all for other AI SDK part types
  | { type: string;[key: string]: unknown };

// Message metadata for token usage, timing, etc.
export interface MessageMetadata {
  model?: string;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  finishReason?: string;
}

interface MessagesProps {
  messages: ChatMessage[];
  history?: ChatHistory;
  /** Parts for the streaming message (last assistant message when streaming) */
  streamingParts?: MessagePart[];
  /** Sources for the streaming message */
  streamingSources?: Source[];
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Current model ID - used to show typing indicator with correct model icon */
  currentModelId?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (
    messageId: string,
    options?: RegenerateOptions,
  ) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSwitchBranch?: (messageId: string) => void;
  /** Callback when suggested action is clicked in empty state */
  onSendMessage?: (content: string) => void;
  /** Whether message input is disabled (for suggested actions) */
  inputDisabled?: boolean;
  /** Follow-up suggestions to display after last assistant message */
  followUps?: string[];
  /** Whether follow-ups are being generated */
  isGeneratingFollowUps?: boolean;
  /** Callback when a follow-up is selected */
  onFollowUpSelect?: (followUp: string) => void;
}

export const Messages = memo(function Messages({
  messages,
  history,
  streamingParts,
  streamingSources,
  isStreaming,
  currentModelId,
  onEditMessage,
  onRegenerateMessage,
  onDeleteMessage,
  onSwitchBranch,
  followUps,
  isGeneratingFollowUps,
  onFollowUpSelect,
  highlightMessageId,
}: MessagesProps & { highlightMessageId?: string }) {
  // Use observer-based scroll handling instead of useEffect on messages
  const { containerRef, endRef, isAtBottom, scrollToBottom } =
    useScrollToBottom();

  // Scroll to highlighted message if present
  useEffect(() => {
    if (highlightMessageId && messages.length > 0) {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(highlightMessageId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Add highlight class temporarily
          element.classList.add("bg-blue-50/50", "dark:bg-blue-900/20", "transition-colors", "duration-1000");
          setTimeout(() => {
            element.classList.remove("bg-blue-50/50", "dark:bg-blue-900/20");
          }, 2000);
        }
      }, 500);
    } else {
      // Only scroll to bottom if we're NOT trying to highlight a specific message
      // Small timeout to ensure DOM is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom, highlightMessageId]);

  // Smooth scroll button visibility with animation
  const { shouldRender: showScrollButton, isVisible: scrollButtonVisible } =
    useScrollButtonVisibility(isAtBottom);

  // Anchor user message at top when streaming starts
  const { lastUserMessageRef } = useStreamingAnchor(
    containerRef,
    messages,
    isStreaming,
  );

  // Track seen message IDs for animation - handles branch switching correctly
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Ref for history to avoid recreating callbacks during streaming
  const historyRef = useRef(history);

  // Keep historyRef in sync
  useEffect(() => {
    historyRef.current = history;
  });

  // Mark messages as seen after render
  useEffect(() => {
    messages.forEach((m) => seenMessageIdsRef.current.add(m.id));
  });

  // Get branch info for a message - uses ref for stable callback
  const getMessageBranchInfo = useCallback(
    (messageId: string): BranchInfo | null => {
      if (!historyRef.current) return null;
      return getBranchInfo(historyRef.current, messageId);
    },
    [],
  );

  // Navigate to previous sibling branch - uses ref for stable callback
  const handlePreviousBranch = useCallback(
    (messageId: string) => {
      if (!historyRef.current || !onSwitchBranch) return;
      const siblings = getSiblings(historyRef.current, messageId);
      const currentIdx = siblings.indexOf(messageId);
      if (currentIdx > 0) {
        const prevSiblingId = siblings[currentIdx - 1];
        const targetId = getDeepestChild(historyRef.current, prevSiblingId);
        onSwitchBranch(targetId);
      }
    },
    [onSwitchBranch],
  );

  // Navigate to next sibling branch - uses ref for stable callback
  const handleNextBranch = useCallback(
    (messageId: string) => {
      if (!historyRef.current || !onSwitchBranch) return;
      const siblings = getSiblings(historyRef.current, messageId);
      const currentIdx = siblings.indexOf(messageId);
      if (currentIdx < siblings.length - 1) {
        const nextSiblingId = siblings[currentIdx + 1];
        const targetId = getDeepestChild(historyRef.current, nextSiblingId);
        onSwitchBranch(targetId);
      }
    },
    [onSwitchBranch],
  );

  // Count new messages for staggered animation delays
  // NOTE: Must be defined before any early returns to comply with Rules of Hooks
  const newMessagesCount = useRef(0);

  // Reset counter at start of each render so each batch of new messages
  // starts with fresh animation delays (0ms, 50ms, 100ms...) instead of
  // accumulating from previous renders
  newMessagesCount.current = 0;

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        {/* Empty state - clean and minimal */}
        <div className="text-center max-w-lg mx-auto px-2">
          <h1 className="text-3xl sm:text-3xl font-semibold tracking-[-0.02em] mb-2 sm:mb-3 text-gray-800 dark:text-gray-100">
            How can I help you today?
          </h1>
          <p className="text-sm sm:text-base text-gray-400 dark:text-gray-500 leading-relaxed">
            Start a conversation below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full overflow-y-auto chat-scrollbar">
        {/* Messages container */}
        <div className="max-w-5xl mx-auto px-4 sm:px-5 md:px-6 pb-36 sm:pb-40 pt-20">
          <div className="space-y-5 sm:space-y-6 md:space-y-7">
            {messages.map((message, index) => {
              const textContent = getMessageText(message);
              const isLastMessage = index === messages.length - 1;
              const branchInfo = getMessageBranchInfo(message.id);
              // ID-based tracking: animate only messages we haven't seen before
              // This handles branch switching correctly (existing messages don't re-animate)
              const isNewMessage = !seenMessageIdsRef.current.has(message.id);
              // Check if this is the streaming message (last assistant message while streaming)
              const isStreamingMessage =
                isStreaming && isLastMessage && message.role === "assistant";

              // Track new message index for staggered delays
              let newMessageIndex = 0;
              if (isNewMessage) {
                newMessageIndex = newMessagesCount.current++;
              }

              if (message.role === "user") {
                // Check if this is the last user message (for anchoring during streaming)
                const isLastUserMessage =
                  index === messages.length - 1 ||
                  (index === messages.length - 2 &&
                    messages[messages.length - 1]?.role === "assistant");

                return (
                  <div
                    id={message.id}
                    key={message.id}
                    ref={isLastUserMessage ? lastUserMessageRef : undefined}
                    className={isNewMessage ? "message-enter" : undefined}
                    style={
                      isNewMessage
                        ? { animationDelay: `${newMessageIndex * 50}ms` }
                        : undefined
                    }
                  >
                    <UserMessage
                      content={message.content}
                      messageId={message.id}
                      onEditMessage={onEditMessage}
                      onDeleteMessage={onDeleteMessage}
                      branchInfo={branchInfo}
                      onPreviousBranchMessage={handlePreviousBranch}
                      onNextBranchMessage={handleNextBranch}
                      edited={message.edited}
                    />
                  </div>
                );
              }

              return (
                <div
                  id={message.id}
                  key={message.id}
                  className={cn(
                    isNewMessage && "message-enter",
                    isStreamingMessage && "message-streaming",
                  )}
                  style={
                    isNewMessage
                      ? { animationDelay: `${newMessageIndex * 50}ms` }
                      : undefined
                  }
                >
                  <AssistantMessage
                    content={textContent}
                    messageId={message.id}
                    model={message.model}
                    // Pass streaming-specific props only to the streaming message
                    parts={isStreamingMessage ? streamingParts : undefined}
                    sources={isStreamingMessage ? streamingSources : undefined}
                    isLoading={isStreamingMessage}
                    onRegenerateMessage={
                      isLastMessage && !isStreaming
                        ? onRegenerateMessage
                        : undefined
                    }
                    onDeleteMessage={onDeleteMessage}
                    branchInfo={branchInfo}
                    onPreviousBranchMessage={handlePreviousBranch}
                    onNextBranchMessage={handleNextBranch}
                  />

                  {/* Follow-ups attached to last assistant message - aligned with text content */}
                  {isLastMessage &&
                    message.role === "assistant" &&
                    !isStreaming &&
                    onFollowUpSelect && (
                      <div className="mt-3 sm:mt-4 pl-8 sm:pl-10 md:pl-11">
                        {isGeneratingFollowUps ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Spinner size="sm" />
                            <span>Generating suggestions...</span>
                          </div>
                        ) : followUps && followUps.length > 0 ? (
                          <FollowUps
                            followUps={followUps}
                            onSelect={onFollowUpSelect}
                          />
                        ) : null}
                      </div>
                    )}
                </div>
              );
            })}

            {/* Typing indicator placeholder - shown when streaming but no assistant message yet */}
            {isStreaming &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "user" && (
                <div className="message-enter">
                  <AssistantMessage
                    content=""
                    model={currentModelId}
                    isLoading={true}
                  />
                </div>
              )}
          </div>

          {/* Scroll anchor with padding */}
          <div ref={endRef} className="h-12" />
        </div>
      </div>

      {/* Scroll to bottom button - appears when not at bottom with smooth animation */}
      {showScrollButton && (
        <div
          className={cn(
            "absolute bottom-28 sm:bottom-32 left-1/2 z-10 transition-all duration-300 ease-out",
            scrollButtonVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-95",
          )}
          style={{
            transform: `translateX(-50%) translateY(${scrollButtonVisible ? 0 : 8}px) scale(${scrollButtonVisible ? 1 : 0.95})`,
          }}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full shadow-lg bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-xl transition-all duration-200 hover:scale-105"
            onClick={() => scrollToBottom("smooth")}
          >
            <ArrowDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="sr-only">Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  );
});
