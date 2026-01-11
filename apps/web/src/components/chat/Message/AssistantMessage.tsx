import { useMemo, useState, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { MessageActions } from './MessageActions';
import { cn } from '@/lib/utils';

interface AssistantMessageProps {
  content: string;
  model?: string;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

// Provider-specific icons
function getModelIcon(model?: string): { icon: string; gradient: string } {
  if (!model) return { icon: 'AI', gradient: 'from-accent to-accent-hover' };

  const modelLower = model.toLowerCase();

  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return { icon: 'A', gradient: 'from-orange-500 to-amber-500' };
  }
  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return { icon: 'G', gradient: 'from-emerald-500 to-teal-500' };
  }
  if (modelLower.includes('gemini') || modelLower.includes('google')) {
    return { icon: 'G', gradient: 'from-blue-500 to-indigo-500' };
  }
  if (modelLower.includes('llama') || modelLower.includes('meta')) {
    return { icon: 'L', gradient: 'from-purple-500 to-pink-500' };
  }
  if (modelLower.includes('mistral')) {
    return { icon: 'M', gradient: 'from-cyan-500 to-blue-500' };
  }

  return { icon: 'AI', gradient: 'from-accent to-accent-hover' };
}

// Extract short model name
function getModelName(model?: string): string | undefined {
  if (!model) return undefined;

  // Handle provider:model format
  const parts = model.split(':');
  const modelPart = parts.length > 1 ? parts[1] : parts[0];

  // Shorten common model names
  const shortened = modelPart
    .replace('claude-', '')
    .replace('gpt-', 'GPT-')
    .replace('-turbo', ' Turbo')
    .replace('-preview', ' Preview')
    .replace('-latest', '');

  return shortened;
}

export function AssistantMessage({
  content,
  model,
  isStreaming,
  onCopy,
  onRegenerate,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  // Parse markdown to HTML - sanitized with DOMPurify to prevent XSS
  const htmlContent = useMemo(() => {
    if (!content) return '';
    // DOMPurify sanitizes the HTML to prevent XSS attacks
    return DOMPurify.sanitize(marked.parse(content) as string);
  }, [content]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [content, onCopy]);

  const { icon, gradient } = getModelIcon(model);
  const modelName = getModelName(model);

  return (
    <div className="group flex gap-3">
      {/* Model avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm',
          `bg-gradient-to-br ${gradient}`
        )}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        {/* Model name */}
        {modelName && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium flex items-center gap-1.5">
            <span>{modelName}</span>
            {isStreaming && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
              </span>
            )}
          </div>
        )}

        {/* Content - using sanitized HTML */}
        <div className="relative">
          {content ? (
            <div
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none',
                // Code block styling
                'prose-pre:bg-transparent prose-pre:p-0 prose-pre:my-0',
                // Inline code
                'prose-code:text-accent prose-code:bg-accent/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[\'\'] prose-code:after:content-[\'\']',
                // Links
                'prose-a:text-accent prose-a:no-underline hover:prose-a:underline',
                // Lists
                'prose-li:marker:text-gray-400'
              )}
              // Safe: content is sanitized with DOMPurify above
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 py-1">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          ) : null}

          {/* Streaming cursor */}
          {isStreaming && content && (
            <span className="inline-block w-2 h-4 bg-accent/70 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Actions - always visible but more subtle */}
        {!isStreaming && content && (
          <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageActions
              onCopy={handleCopy}
              onRegenerate={onRegenerate}
              isUser={false}
            />
            {copied && (
              <span className="text-xs text-success ml-2">Copied!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
