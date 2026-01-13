import { useState, useCallback, memo } from 'react';
import { Streamdown } from 'streamdown';
import { MessageActions } from './MessageActions';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface AssistantMessageProps {
  content: string;
  model?: string;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

// Provider-specific styling
function getModelStyle(model?: string): { letter: string; bg: string; text: string; name: string } {
  if (!model) return { letter: 'AI', bg: 'bg-muted', text: 'text-muted-foreground', name: 'Assistant' };

  const modelLower = model.toLowerCase();

  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return {
      letter: 'C',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('gpt') || modelLower.includes('openai')) {
    return {
      letter: 'G',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('gemini') || modelLower.includes('google')) {
    return {
      letter: 'G',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('llama') || modelLower.includes('meta')) {
    return {
      letter: 'L',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      name: formatModelName(model)
    };
  }
  if (modelLower.includes('mistral')) {
    return {
      letter: 'M',
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      name: formatModelName(model)
    };
  }

  return {
    letter: 'AI',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
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

export const AssistantMessage = memo(function AssistantMessage({
  content,
  model,
  isStreaming,
  onCopy,
  onRegenerate,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [content, onCopy]);

  const { letter, bg, text, name } = getModelStyle(model);

  return (
    <div className="group">
      {/* Model indicator */}
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar className="h-7 w-7">
          <AvatarFallback className={cn('text-xs font-semibold', bg, text)}>
            {letter}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {name}
          </span>
          {isStreaming && (
            <Badge variant="secondary" className="gap-1.5 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Thinking
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative pl-9">
        {content ? (
          <Streamdown>{content}</Streamdown>
        ) : isStreaming ? (
          <div className="flex items-center gap-3 py-2">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm text-muted-foreground">Generating response...</span>
          </div>
        ) : null}

        {/* Actions */}
        {!isStreaming && content && (
          <div className="mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <MessageActions
              onCopy={handleCopy}
              onRegenerate={onRegenerate}
              isUser={false}
            />
            {copied && (
              <span className="text-xs text-green-600 dark:text-green-400 ml-2 animate-in fade-in">Copied!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
