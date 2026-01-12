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

// Provider-specific styling
function getModelStyle(model?: string): { letter: string; bg: string; text: string; name: string } {
  if (!model) return { letter: 'AI', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', name: 'Assistant' };

  const modelLower = model.toLowerCase();

  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return {
      letter: 'C',
      bg: 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return {
      letter: 'G',
      bg: 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('gemini') || modelLower.includes('google')) {
    return {
      letter: 'G',
      bg: 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('llama') || modelLower.includes('meta')) {
    return {
      letter: 'L',
      bg: 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('mistral')) {
    return {
      letter: 'M',
      bg: 'bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      name: formatModelName(model)
    };
  }

  return {
    letter: 'AI',
    bg: 'bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-800 dark:to-slate-800',
    text: 'text-gray-600 dark:text-gray-300',
    name: formatModelName(model)
  };
}

function formatModelName(model?: string): string {
  if (!model) return 'Assistant';

  // Handle provider:model format
  const parts = model.split(':');
  const modelPart = parts.length > 1 ? parts[1] : parts[0];

  return modelPart
    .replace('claude-', 'Claude ')
    .replace('gpt-', 'GPT-')
    .replace('-turbo', ' Turbo')
    .replace('-preview', ' Preview')
    .replace('-latest', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

export function AssistantMessage({
  content,
  model,
  isStreaming,
  onCopy,
  onRegenerate,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  // Parse markdown and sanitize with DOMPurify to prevent XSS attacks
  // DOMPurify is a trusted sanitizer that removes malicious content
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';
    const rawHtml = marked.parse(content) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [content, onCopy]);

  const { letter, bg, text, name } = getModelStyle(model);

  return (
    <div className="group">
      {/* Model indicator - subtle, above content */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shadow-soft-sm',
            bg,
            text
          )}
        >
          {letter}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {name}
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="font-medium">Thinking</span>
            </span>
          )}
        </div>
      </div>

      {/* Content - full width prose */}
      <div className="relative pl-9">
        {content ? (
          <div
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : isStreaming ? (
          <div className="flex items-center gap-3 py-2">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-accent/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Generating response...</span>
          </div>
        ) : null}

        {/* Actions - appear on hover */}
        {!isStreaming && content && (
          <div className="mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions
              onCopy={handleCopy}
              onRegenerate={onRegenerate}
              isUser={false}
            />
            {copied && (
              <span className="text-xs text-success ml-2 animate-in fade-in">Copied!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
