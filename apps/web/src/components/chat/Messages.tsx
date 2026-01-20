import { useRef, useEffect, memo, useCallback, useState } from 'react';
import { type ChatMessage, type ChatHistory } from '@onera/types';
import { UserMessage, AssistantMessage, type BranchInfo, type RegenerateOptions } from './Message';
import { cn } from '@/lib/utils';
import { getMessageText } from '@/lib/chat/messageUtils';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import {
  getBranchInfo,
  getSiblings,
  getDeepestChild,
} from '@/lib/messageTree';
import type { Source } from './Sources';
import { SuggestedActions } from './SuggestedActions';
import { FollowUps } from './FollowUps';
import { ArrowDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  isStreaming: boolean | undefined
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
    const isNewUserMessage = messageCountIncreased && lastMessage?.role === 'user';
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
    const shouldAnchor = (isNewUserMessage || streamingJustStarted) && 
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
        const relativeTop = messageRect.top - containerRect.top + container.scrollTop;
        
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
export type ToolInvocationState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

export interface ToolInvocationPart {
  type: 'tool-invocation';
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  state: ToolInvocationState;
  errorText?: string;
}

export interface SourcePart {
  type: 'source';
  source: {
    sourceType?: string;
    url?: string;
    title?: string;
    domain?: string;
  };
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string; providerMetadata?: unknown }
  | ToolInvocationPart
  | SourcePart
  | { type: 'file'; data: string; mediaType: string; url?: string; filename?: string }
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
  onRegenerateMessage?: (messageId: string, options?: RegenerateOptions) => void;
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
  onSendMessage,
  inputDisabled,
  followUps,
  isGeneratingFollowUps,
  onFollowUpSelect,
}: MessagesProps) {
  // Use observer-based scroll handling instead of useEffect on messages
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();
  
  // Smooth scroll button visibility with animation
  const { shouldRender: showScrollButton, isVisible: scrollButtonVisible } = useScrollButtonVisibility(isAtBottom);

  // Anchor user message at top when streaming starts
  const { lastUserMessageRef } = useStreamingAnchor(containerRef, messages, isStreaming);

  // Track seen message IDs for animation - handles branch switching correctly
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  // Mark messages as seen after render
  useEffect(() => {
    messages.forEach(m => seenMessageIdsRef.current.add(m.id));
  });

  // Get branch info for a message
  const getMessageBranchInfo = useCallback(
    (messageId: string): BranchInfo | null => {
      if (!history) return null;
      return getBranchInfo(history, messageId);
    },
    [history]
  );

  // Navigate to previous sibling branch
  const handlePreviousBranch = useCallback(
    (messageId: string) => {
      if (!history || !onSwitchBranch) return;
      const siblings = getSiblings(history, messageId);
      const currentIdx = siblings.indexOf(messageId);
      if (currentIdx > 0) {
        const prevSiblingId = siblings[currentIdx - 1];
        const targetId = getDeepestChild(history, prevSiblingId);
        onSwitchBranch(targetId);
      }
    },
    [history, onSwitchBranch]
  );

  // Navigate to next sibling branch
  const handleNextBranch = useCallback(
    (messageId: string) => {
      if (!history || !onSwitchBranch) return;
      const siblings = getSiblings(history, messageId);
      const currentIdx = siblings.indexOf(messageId);
      if (currentIdx < siblings.length - 1) {
        const nextSiblingId = siblings[currentIdx + 1];
        const targetId = getDeepestChild(history, nextSiblingId);
        onSwitchBranch(targetId);
      }
    },
    [history, onSwitchBranch]
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
        {/* Empty state */}
        <div className="text-center mb-8 max-w-lg mx-auto">
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
            How can I help you today?
          </h1>
          <p className="text-base text-muted-foreground">
            Start a conversation or try one of the suggestions below.
          </p>
        </div>

        {/* Suggested actions grid */}
        {onSendMessage && (
          <div className="w-full max-w-2xl px-4">
            <SuggestedActions
              onSend={onSendMessage}
              disabled={inputDisabled}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full overflow-y-auto chat-scrollbar">
        {/* Messages container */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 pb-36">
          <div className="space-y-10 message-gap">
            {messages.map((message, index) => {
              const textContent = getMessageText(message);
              const isLastMessage = index === messages.length - 1;
              const branchInfo = getMessageBranchInfo(message.id);
              // ID-based tracking: animate only messages we haven't seen before
              // This handles branch switching correctly (existing messages don't re-animate)
              const isNewMessage = !seenMessageIdsRef.current.has(message.id);
              // Check if this is the streaming message (last assistant message while streaming)
              const isStreamingMessage = isStreaming && isLastMessage && message.role === 'assistant';

              // Track new message index for staggered delays
              let newMessageIndex = 0;
              if (isNewMessage) {
                newMessageIndex = newMessagesCount.current++;
              }

              if (message.role === 'user') {
                // Check if this is the last user message (for anchoring during streaming)
                const isLastUserMessage = index === messages.length - 1 || 
                  (index === messages.length - 2 && messages[messages.length - 1]?.role === 'assistant');
                
                return (
                  <div
                    key={message.id}
                    ref={isLastUserMessage ? lastUserMessageRef : undefined}
                    className={isNewMessage ? 'message-enter' : undefined}
                    style={isNewMessage ? { animationDelay: `${newMessageIndex * 50}ms` } : undefined}
                  >
                    <UserMessage
                      content={message.content}
                      onEdit={onEditMessage ? (newContent) => onEditMessage(message.id, newContent) : undefined}
                      onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
                      branchInfo={branchInfo}
                      onPreviousBranch={() => handlePreviousBranch(message.id)}
                      onNextBranch={() => handleNextBranch(message.id)}
                      edited={message.edited}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    isNewMessage && 'message-enter',
                    isStreamingMessage && 'message-streaming'
                  )}
                  style={isNewMessage ? { animationDelay: `${newMessageIndex * 50}ms` } : undefined}
                >
                  <AssistantMessage
                    content={textContent}
                    model={message.model}
                    // Pass streaming-specific props only to the streaming message
                    parts={isStreamingMessage ? streamingParts : undefined}
                    sources={isStreamingMessage ? streamingSources : undefined}
                    isLoading={isStreamingMessage}
                    onRegenerate={
                      isLastMessage && !isStreaming && onRegenerateMessage
                        ? (options) => onRegenerateMessage(message.id, options)
                        : undefined
                    }
                    onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
                    branchInfo={branchInfo}
                    onPreviousBranch={() => handlePreviousBranch(message.id)}
                    onNextBranch={() => handleNextBranch(message.id)}
                  />
                  
                  {/* Follow-ups attached to last assistant message - aligned with text content */}
                  {isLastMessage && message.role === 'assistant' && !isStreaming && onFollowUpSelect && (
                    <div className="mt-4 pl-10 md:pl-11">
                      {isGeneratingFollowUps ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
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
            {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
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
            "absolute bottom-6 left-1/2 z-10 transition-all duration-200",
            scrollButtonVisible 
              ? "opacity-100 translate-y-0 scale-100" 
              : "opacity-0 translate-y-2 scale-95"
          )}
          style={{ transform: `translateX(-50%) translateY(${scrollButtonVisible ? 0 : 8}px) scale(${scrollButtonVisible ? 1 : 0.95})` }}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full shadow-lg bg-background/90 backdrop-blur-md border-border/40 hover:bg-background hover:border-border/60 hover:shadow-xl transition-all duration-200 hover:scale-105"
            onClick={() => scrollToBottom('smooth')}
          >
            <ArrowDown className="h-4 w-4" />
            <span className="sr-only">Scroll to bottom</span>
          </Button>
        </div>
      )}
    </div>
  );
});

