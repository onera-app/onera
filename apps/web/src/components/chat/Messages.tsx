import { useRef, useEffect } from 'react';
import type { ChatMessage } from '@cortex/types';
import { UserMessage, AssistantMessage } from './Message';

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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Start a conversation</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Send a message to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message, index) => {
          const content = getMessageContent(message);
          const isLastMessage = index === messages.length - 1;

          if (message.role === 'user') {
            return (
              <UserMessage
                key={message.id}
                content={content}
                onEdit={onEditMessage ? (newContent) => onEditMessage(message.id, newContent) : undefined}
              />
            );
          }

          return (
            <AssistantMessage
              key={message.id}
              content={content}
              model={message.model}
              onRegenerate={
                isLastMessage && onRegenerateMessage
                  ? () => onRegenerateMessage(message.id)
                  : undefined
              }
            />
          );
        })}

        {/* Streaming message */}
        {streamingMessage !== undefined && (
          <AssistantMessage
            content={streamingMessage}
            model={streamingModel}
            isStreaming={isStreaming}
          />
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
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
