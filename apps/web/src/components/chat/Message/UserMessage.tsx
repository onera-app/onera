import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MessageActions } from './MessageActions';

interface UserMessageProps {
  content: string;
  onEdit?: (newContent: string) => void;
  onCopy?: () => void;
}

export function UserMessage({ content, onEdit, onCopy }: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const handleStartEdit = () => {
    setEditValue(content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== content) {
      onEdit?.(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(content);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex justify-end animate-in fade-in-scale">
        <div className="max-w-[85%] w-full">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              className={cn(
                'w-full px-4 py-3.5 rounded-2xl resize-none',
                'bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-white',
                'border-2 border-accent/30',
                'focus:outline-none focus:border-accent',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'text-[15px] leading-relaxed',
                'transition-colors duration-150'
              )}
              rows={1}
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={handleCancelEdit}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl',
                'text-gray-600 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors duration-150'
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={!editValue.trim() || editValue.trim() === content}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-xl',
                'bg-accent text-white',
                'hover:bg-accent-hover',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150',
                'shadow-soft-sm'
              )}
            >
              Save & Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-end gap-3">
      {/* Actions - appear on hover */}
      <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <MessageActions
          onCopy={handleCopy}
          onEdit={onEdit ? handleStartEdit : undefined}
          isUser
        />
        {copied && (
          <span className="text-xs text-success animate-in fade-in">Copied!</span>
        )}
      </div>

      {/* Message bubble - refined styling */}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          'bg-accent/10 dark:bg-accent/15',
          'text-gray-800 dark:text-gray-100',
          'shadow-soft-sm'
        )}
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
