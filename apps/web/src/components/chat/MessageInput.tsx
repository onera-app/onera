import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

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
      {/* Main input container - floating card style */}
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700/60',
          'shadow-soft-lg dark:shadow-none',
          'transition-all duration-200',
          'focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/10',
          disabled && 'opacity-60'
        )}
      >
        {/* Textarea row */}
        <div className="flex items-end">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              'flex-1 w-full bg-transparent resize-none',
              'px-4 py-4',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none',
              'disabled:cursor-not-allowed',
              'max-h-[200px] min-h-[56px]',
              'text-[15px] leading-relaxed'
            )}
          />

          {/* Right side actions */}
          <div className="flex items-center gap-2 pr-3 pb-3">
            {/* Attach file button */}
            <button
              type="button"
              disabled={disabled || isStreaming}
              className={cn(
                'p-2 rounded-xl transition-all duration-150',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>

            {/* Send/Stop button */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-150',
                  'bg-gray-900 dark:bg-gray-100',
                  'text-white dark:text-gray-900',
                  'hover:bg-gray-800 dark:hover:bg-gray-200',
                  'shadow-soft-sm'
                )}
                title="Stop generating"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-150',
                  canSend
                    ? 'bg-accent text-white hover:bg-accent-hover shadow-soft-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                )}
                title="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard hints - minimal */}
      <div className="flex items-center justify-center mt-2.5 gap-3 text-[11px] text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px]">
            Enter
          </kbd>
          <span>send</span>
        </div>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px]">
            Shift+Enter
          </kbd>
          <span>new line</span>
        </div>
      </div>
    </div>
  );
}
