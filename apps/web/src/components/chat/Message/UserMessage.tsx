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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
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
      <div className="flex justify-end">
        <div className="max-w-[80%] w-full">
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
              'w-full px-4 py-3 rounded-2xl resize-none',
              'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-accent',
              'placeholder-gray-500'
            )}
            rows={1}
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Save & Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-end gap-2">
      {/* Actions - appear on hover */}
      <MessageActions
        onCopy={handleCopy}
        onEdit={onEdit ? handleStartEdit : undefined}
        isUser
        className="self-center opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* Message bubble - subtle dark/light styling */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3',
          'bg-gray-200 dark:bg-gray-700',
          'text-gray-900 dark:text-white'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
      </div>
    </div>
  );
}
