import { useRef, useEffect, memo, useCallback } from 'react';
import type { ChatMessage, ChatHistory } from '@onera/types';
import { UserMessage, AssistantMessage, type BranchInfo, type RegenerateOptions } from './Message';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getBranchInfo,
  getSiblings,
  getDeepestChild,
} from '@/lib/messageTree';
import type { Source } from './Sources';

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
  streamingMessage?: string;
  streamingParts?: MessagePart[];
  streamingMetadata?: MessageMetadata;
  streamingSources?: Source[];
  isStreaming?: boolean;
  streamingModel?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (messageId: string, options?: RegenerateOptions) => void;
  onSwitchBranch?: (messageId: string) => void;
}

export const Messages = memo(function Messages({
  messages,
  history,
  streamingMessage,
  streamingParts,
  streamingMetadata,
  streamingSources,
  isStreaming,
  streamingModel,
  onEditMessage,
  onRegenerateMessage,
  onSwitchBranch,
}: MessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

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

  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <EmptyState
          icon={MessageSquare}
          size="lg"
          title="Start a conversation"
          description="Send a message to begin your encrypted conversation"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {/* Messages container with generous padding */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-8 message-gap">
          {messages.map((message, index) => {
            const textContent = getMessageContent(message);
            const isLastMessage = index === messages.length - 1;
            const branchInfo = getMessageBranchInfo(message.id);

            if (message.role === 'user') {
              return (
                <div key={message.id} className="message-enter" style={{ animationDelay: `${index * 50}ms` }}>
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
              <div key={message.id} className="message-enter" style={{ animationDelay: `${index * 50}ms` }}>
                <AssistantMessage
                  content={textContent}
                  model={message.model}
                  onRegenerate={
                    isLastMessage && onRegenerateMessage
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

          {/* Streaming message */}
          {streamingMessage !== undefined && (
            <div className={cn('message-enter', isStreaming && 'message-streaming')}>
              <AssistantMessage
                content={streamingMessage}
                parts={streamingParts}
                metadata={streamingMetadata}
                sources={streamingSources}
                model={streamingModel}
                isStreaming={isStreaming}
              />
            </div>
          )}
        </div>

        {/* Scroll anchor with padding */}
        <div ref={bottomRef} className="h-8" />
      </div>
    </div>
  );
});

function getMessageContent(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n');
}
