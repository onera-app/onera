import { useMemo, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MessageActions } from './MessageActions';

interface AssistantMessageProps {
  content: string;
  model?: string;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

export function AssistantMessage({
  content,
  model,
  isStreaming,
  onCopy,
  onRegenerate,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  const htmlContent = useMemo(() => {
    if (!content) return '';
    return DOMPurify.sanitize(marked.parse(content) as string);
  }, [content]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  // Extract model display name
  const modelName = model?.split(':')[1] || model;

  return (
    <div className="group flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
        AI
      </div>

      <div className="flex-1 min-w-0">
        {/* Model indicator */}
        {modelName && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
            {modelName}
          </div>
        )}

        {/* Content */}
        <div className="relative">
          {content ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-gray-100 prose-pre:dark:bg-gray-800 prose-code:text-purple-600 prose-code:dark:text-purple-400 prose-code:before:content-[''] prose-code:after:content-['']"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          ) : null}

          {/* Streaming indicator */}
          {isStreaming && content && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-400">Generating...</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isStreaming && content && (
          <div className="mt-2 flex items-center gap-1">
            <MessageActions
              onCopy={handleCopy}
              onRegenerate={onRegenerate}
              isUser={false}
              className="opacity-100"
            />
            {copied && (
              <span className="text-xs text-green-600 dark:text-green-400 ml-2">Copied!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
