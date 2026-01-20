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
  onDelete?: () => void;
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

// Document info extracted from content
interface DocumentInfo {
  url: string;
  fileName: string;
  mimeType: string;
}

// Helper to extract documents from MessageContent[]
function getDocuments(content: string | MessageContent[]): DocumentInfo[] {
  if (typeof content === 'string') return [];
  return content
    .filter((c) => c.type === 'document_url' && c.document_url?.url)
    .map((c) => ({
      url: c.document_url!.url,
      fileName: c.document_url!.fileName,
      mimeType: c.document_url!.mimeType,
    }));
}

export const UserMessage = memo(function UserMessage({
  content,
  onEdit,
  onDelete,
  onCopy,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
  edited,
}: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textContent = getTextContent(content);
  const images = getImages(content);
  const documents = getDocuments(content);
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
                'text-body leading-relaxed'
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
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role="user"
    >
      <div className="flex w-full items-start gap-2 md:gap-3 justify-end">
        {/* Actions (visible with subtle opacity, full on hover) */}
        <div className="self-center flex items-center gap-1 opacity-50 group-hover/message:opacity-100 transition-opacity duration-200">
          <MessageActions
            onCopy={handleCopy}
            onEdit={onEdit ? handleStartEdit : undefined}
            onDelete={onDelete}
            isUser
            branchInfo={branchInfo}
            onPreviousBranch={onPreviousBranch}
            onNextBranch={onNextBranch}
          />
          {copied && (
            <span className="text-xs text-status-success-text animate-in fade-in">Copied!</span>
          )}
        </div>

        {/* Message content */}
        <div className="flex flex-col max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]">
          {/* Attachments/Images */}
          {images.length > 0 && (
            <div className="flex flex-row justify-end gap-2 mb-2">
              {images.map((src, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-lg"
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

          {/* Documents */}
          {documents.length > 0 && (
            <div className="flex flex-col items-end gap-2 mb-2">
              {documents.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  download={doc.fileName}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg',
                    'bg-muted/50 hover:bg-muted transition-colors',
                    'text-sm text-foreground'
                  )}
                >
                  <svg
                    className="h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="truncate max-w-[200px]">{doc.fileName}</span>
                </a>
              ))}
            </div>
          )}

          {/* Text bubble - Vercel style blue bubble equivalent using theme */}
          {textContent && (
            <div
              className="wrap-break-word w-fit rounded-2xl rounded-tr-sm px-4 py-2.5 text-left bg-primary text-primary-foreground shadow-sm"
            >
              <p className="whitespace-pre-wrap break-words text-base leading-normal">{textContent}</p>
            </div>
          )}


          {edited && (
            <span className="text-xs text-muted-foreground mt-1 text-right">edited</span>
          )}
        </div>
      </div>
    </div>
  );
});
