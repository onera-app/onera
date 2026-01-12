import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Paperclip, ArrowUp, Square } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onStop?: () => void;
  isStreaming?: boolean;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Message Cortex...',
  onStop,
  isStreaming = false,
}: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setValue('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Main input container */}
      <div
        className={cn(
          'relative rounded-xl overflow-hidden',
          'bg-background',
          'border border-input',
          'shadow-sm',
          'transition-all duration-200',
          'focus-within:ring-1 focus-within:ring-ring',
          disabled && 'opacity-60'
        )}
      >
        {/* Textarea row */}
        <div className="flex items-end">
          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              'flex-1 w-full bg-transparent resize-none border-0 shadow-none',
              'px-4 py-4',
              'focus-visible:ring-0',
              'disabled:cursor-not-allowed',
              'max-h-[200px] min-h-[56px]',
              'text-[15px] leading-relaxed'
            )}
          />

          {/* Right side actions */}
          <div className="flex items-center gap-2 pr-3 pb-3">
            {/* Attach file button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled || isStreaming}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>

            {/* Send/Stop button */}
            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onStop}
                    size="icon"
                    className="h-9 w-9"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop generating</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSend}
                    size="icon"
                    className="h-9 w-9"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send message</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="flex items-center justify-center mt-2.5 gap-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
            Enter
          </kbd>
          <span>send</span>
        </div>
        <span className="text-border">/</span>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
            Shift+Enter
          </kbd>
          <span>new line</span>
        </div>
      </div>
    </div>
  );
}
