import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { MessageActions } from './MessageActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { BranchInfo } from './BranchNavigation';
import type { MessageContent } from '@onera/types';

interface UserMessageProps {
  content: string | MessageContent[];
  onEdit?: (newContent: string) => void;
  onCopy?: () => void;
  branchInfo?: BranchInfo | null;
  onPreviousBranch?: () => void;
  onNextBranch?: () => void;
  edited?: boolean;
}

// Helper to extract text content from MessageContent[]
function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === 'string') return content;
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n');
}

// Helper to extract images from MessageContent[]
function getImages(content: string | MessageContent[]): string[] {
  if (typeof content === 'string') return [];
  return content
    .filter((c) => c.type === 'image_url' && c.image_url?.url)
    .map((c) => c.image_url!.url);
}

export const UserMessage = memo(function UserMessage({
  content,
  onEdit,
  onCopy,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
  edited,
}: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textContent = getTextContent(content);
  const images = getImages(content);
  const [editValue, setEditValue] = useState(textContent);
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
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const handleStartEdit = () => {
    setEditValue(textContent);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== textContent) {
      onEdit?.(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(textContent);
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
              disabled={!editValue.trim() || editValue.trim() === textContent}
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
          branchInfo={branchInfo}
          onPreviousBranch={onPreviousBranch}
          onNextBranch={onNextBranch}
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
        {/* Display images if any */}
        {images.length > 0 && (
          <div className={cn(
            'flex flex-wrap gap-2 mb-2',
            images.length === 1 ? 'justify-end' : 'justify-start'
          )}>
            {images.map((src, idx) => (
              <div
                key={idx}
                className="relative group/img overflow-hidden rounded-lg"
              >
                <img
                  src={src}
                  alt={`Attached image ${idx + 1}`}
                  className={cn(
                    'max-h-64 max-w-full object-contain rounded-lg',
                    'cursor-pointer transition-transform hover:scale-[1.02]'
                  )}
                  onClick={() => window.open(src, '_blank')}
                />
              </div>
            ))}
          </div>
        )}
        {/* Display text content */}
        {textContent && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{textContent}</p>
        )}
        {edited && (
          <span className="text-xs text-muted-foreground mt-1 block">edited</span>
        )}
      </div>
    </div>
  );
});
