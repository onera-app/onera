import { useRef, useEffect } from 'react';
import type { ChatMessage } from '@cortex/types';
import { cn } from '@/lib/utils';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MessagesProps {
  messages: ChatMessage[];
  streamingMessage?: string;
  isStreaming?: boolean;
}

export function Messages({ messages, streamingMessage, isStreaming }: MessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  if (messages.length === 0 && !streamingMessage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {/* Streaming message */}
      {streamingMessage !== undefined && (
        <StreamingMessage content={streamingMessage} isStreaming={isStreaming} />
      )}
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  // Get content as string
  const content =
    typeof message.content === 'string'
      ? message.content
      : message.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n');

  // Parse markdown for assistant messages
  const htmlContent = isUser
    ? content
    : DOMPurify.sanitize(marked.parse(content) as string);

  return (
    <div
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}
      </div>
    </div>
  );
}

function StreamingMessage({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  // Parse markdown for streaming content
  const htmlContent = content
    ? DOMPurify.sanitize(marked.parse(content) as string)
    : '';

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}
      >
        {content ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        ) : isStreaming ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm">Thinking...</span>
          </div>
        ) : null}

        {/* Streaming indicator */}
        {isStreaming && content && (
          <div className="mt-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
