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
  placeholder = 'Send a message...',
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
    <div className="relative max-w-4xl mx-auto">
      <div
        className={cn(
          'relative flex items-end gap-2 px-4 py-3 rounded-2xl',
          'bg-gray-100 dark:bg-gray-800/80',
          'border border-gray-200 dark:border-gray-700/50',
          'focus-within:border-accent/50 dark:focus-within:border-accent/50',
          'focus-within:ring-1 focus-within:ring-accent/20',
          'transition-all shadow-sm'
        )}
      >
        {/* Left toolbar */}
        <div className="flex items-center gap-0.5 pb-0.5">
          {/* Attach file button */}
          <button
            type="button"
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
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
              'w-full bg-transparent resize-none',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'max-h-[200px]',
              'text-[15px] leading-relaxed'
            )}
          />
        </div>

        {/* Right toolbar / Send button */}
        <div className="flex items-center gap-1 pb-0.5">
          {isStreaming ? (
            <button
              onClick={onStop}
              className={cn(
                'p-2 rounded-xl transition-all',
                'bg-error text-white hover:bg-error/90',
                'shadow-sm'
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
                'p-2 rounded-xl transition-all',
                canSend
                  ? 'bg-accent text-white hover:bg-accent-hover shadow-sm'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
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

      {/* Keyboard hint - more subtle */}
      <div className="flex items-center justify-center mt-2 text-[11px] text-gray-400 dark:text-gray-500">
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-mono">
          Enter
        </kbd>
        <span className="mx-1.5">to send</span>
        <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
        <kbd className="px-1.5 py-0.5 rounded bg-gray-200/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-mono">
          Shift + Enter
        </kbd>
        <span className="mx-1.5">for new line</span>
      </div>
    </div>
  );
}
