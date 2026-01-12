import { useRef, useEffect } from 'react';
import type { ChatMessage } from '@cortex/types';
import { UserMessage, AssistantMessage } from './Message';
import { cn } from '@/lib/utils';

interface MessagesProps {
  messages: ChatMessage[];
  streamingMessage?: string;
  isStreaming?: boolean;
  streamingModel?: string;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
}

export function Messages({
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
        <div className="text-center max-w-md">
          {/* Elegant empty state */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center rotate-3 shadow-soft">
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
          </div>
          <h3 className="font-display text-xl text-gray-900 dark:text-gray-100 mb-2">
            Start a conversation
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Send a message to begin your encrypted conversation
          </p>
        </div>
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
}

function getMessageContent(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n');
}
