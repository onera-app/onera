import { useRef, useEffect, memo } from 'react';
import type { ChatMessage } from '@onera/types';
import { UserMessage, AssistantMessage } from './Message';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface MessagesProps {
  messages: ChatMessage[];
  streamingMessage?: string;
  isStreaming?: boolean;
  streamingModel?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
}

export const Messages = memo(function Messages({
  messages,
  streamingMessage,
  isStreaming,
  streamingModel,
  onEditMessage,
  onRegenerateMessage,
}: MessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

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
            const content = getMessageContent(message);
            const isLastMessage = index === messages.length - 1;

            if (message.role === 'user') {
              return (
                <div key={message.id} className="message-enter" style={{ animationDelay: `${index * 50}ms` }}>
                  <UserMessage
                    content={content}
                    onEdit={onEditMessage ? (newContent) => onEditMessage(message.id, newContent) : undefined}
                  />
                </div>
              );
            }

            return (
              <div key={message.id} className="message-enter" style={{ animationDelay: `${index * 50}ms` }}>
                <AssistantMessage
                  content={content}
                  model={message.model}
                  onRegenerate={
                    isLastMessage && onRegenerateMessage
                      ? () => onRegenerateMessage(message.id)
                      : undefined
                  }
                />
              </div>
            );
          })}

          {/* Streaming message */}
          {streamingMessage !== undefined && (
            <div className={cn('message-enter', isStreaming && 'message-streaming')}>
              <AssistantMessage
                content={streamingMessage}
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
