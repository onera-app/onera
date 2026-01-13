import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { MessageActions } from './MessageActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface UserMessageProps {
  content: string;
  onEdit?: (newContent: string) => void;
  onCopy?: () => void;
}

export const UserMessage = memo(function UserMessage({ content, onEdit, onCopy }: UserMessageProps) {
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
            <Textarea
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
                'w-full px-4 py-3.5 rounded-xl resize-none',
                'border-2 border-ring',
                'text-[15px] leading-relaxed'
              )}
              rows={1}
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button
              variant="ghost"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editValue.trim() || editValue.trim() === content}
            >
              Save & Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-end gap-3">
      {/* Actions */}
      <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <MessageActions
          onCopy={handleCopy}
          onEdit={onEdit ? handleStartEdit : undefined}
          isUser
        />
        {copied && (
          <span className="text-xs text-green-600 dark:text-green-400 animate-in fade-in">Copied!</span>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-3',
          'bg-primary/10',
          'text-foreground',
          'shadow-sm'
        )}
      >
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{content}</p>
      </div>
    </div>
  );
});
