import { useRef, useEffect, memo, useCallback } from 'react';
import type { ChatMessage, ChatHistory } from '@onera/types';
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
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  | { type: string; [key: string]: unknown };

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
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (messageId: string, options?: RegenerateOptions) => void;
  onSwitchBranch?: (messageId: string) => void;
  /** Callback when suggested action is clicked in empty state */
  onSendMessage?: (content: string) => void;
  /** Whether message input is disabled (for suggested actions) */
  inputDisabled?: boolean;
}

export const Messages = memo(function Messages({
  messages,
  history,
  streamingParts,
  streamingSources,
  isStreaming,
  onEditMessage,
  onRegenerateMessage,
  onSwitchBranch,
  onSendMessage,
  inputDisabled,
}: MessagesProps) {
  // Use observer-based scroll handling instead of useEffect on messages
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

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

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        {/* Onera branding / empty state */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            How can I help you today?
          </h1>
          <p className="text-muted-foreground">
            Start a conversation or choose a suggestion below
          </p>
        </div>

        {/* Suggested actions grid */}
        {onSendMessage && (
          <div className="w-full max-w-2xl">
            <SuggestedActions
              onSend={onSendMessage}
              disabled={inputDisabled}
            />
          </div>
        )}
      </div>
    );
  }

  // Count new messages for staggered animation delays
  const newMessagesCount = useRef(0);

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full overflow-y-auto">
        {/* Messages container with generous padding */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="space-y-8 message-gap">
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
                return (
                  <div
                    key={message.id}
                    className={isNewMessage ? 'message-enter' : undefined}
                    style={isNewMessage ? { animationDelay: `${newMessageIndex * 50}ms` } : undefined}
                  >
                    <UserMessage
                      content={message.content}
                      onEdit={onEditMessage ? (newContent) => onEditMessage(message.id, newContent) : undefined}
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
                    branchInfo={branchInfo}
                    onPreviousBranch={() => handlePreviousBranch(message.id)}
                    onNextBranch={() => handleNextBranch(message.id)}
                  />
                </div>
              );
            })}
          </div>

          {/* Scroll anchor with padding */}
          <div ref={endRef} className="h-8" />
        </div>
      </div>

      {/* Scroll to bottom button - appears when not at bottom */}
      {!isAtBottom && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shadow-lg bg-background/95 backdrop-blur-sm hover:bg-background"
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
