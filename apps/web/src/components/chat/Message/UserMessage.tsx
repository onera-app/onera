import { HugeiconsIcon } from "@hugeicons/react";
import { FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { useState, useRef, useEffect, memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MessageActions } from "./MessageActions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { BranchInfo } from "./BranchNavigation";
import type { MessageContent } from "@onera/types";

interface UserMessageProps {
  content: string | MessageContent[];
  /** Message ID for callback binding */
  messageId?: string;
  /** Raw edit handler - will be bound to messageId internally */
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Raw delete handler - will be bound to messageId internally */
  onDeleteMessage?: (messageId: string) => void;
  /** Raw branch handlers - will be bound to messageId internally */
  onPreviousBranchMessage?: (messageId: string) => void;
  onNextBranchMessage?: (messageId: string) => void;
  onCopy?: () => void;
  branchInfo?: BranchInfo | null;
  /** @deprecated Use onEditMessage with messageId instead */
  onEdit?: (newContent: string) => void;
  /** @deprecated Use onDeleteMessage with messageId instead */
  onDelete?: () => void;
  /** @deprecated Use onPreviousBranchMessage with messageId instead */
  onPreviousBranch?: () => void;
  /** @deprecated Use onNextBranchMessage with messageId instead */
  onNextBranch?: () => void;
  edited?: boolean;
}

// Helper to extract text content from MessageContent[]
function getTextContent(content: string | MessageContent[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join("\n");
}

// Helper to extract images from MessageContent[]
function getImages(content: string | MessageContent[]): string[] {
  if (typeof content === "string") return [];
  return content
    .filter((c) => c.type === "image_url" && c.image_url?.url)
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
  if (typeof content === "string") return [];
  return content
    .filter((c) => c.type === "document_url" && c.document_url?.url)
    .map((c) => ({
      url: c.document_url!.url,
      fileName: c.document_url!.fileName,
      mimeType: c.document_url!.mimeType,
    }));
}

export const UserMessage = memo(function UserMessage({
  content,
  messageId,
  onEditMessage,
  onDeleteMessage,
  onPreviousBranchMessage,
  onNextBranchMessage,
  onCopy,
  branchInfo,
  // Legacy props for backward compatibility
  onEdit: legacyOnEdit,
  onDelete: legacyOnDelete,
  onPreviousBranch: legacyOnPreviousBranch,
  onNextBranch: legacyOnNextBranch,
  edited,
}: UserMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textContent = getTextContent(content);
  const images = getImages(content);
  const documents = getDocuments(content);
  const [editValue, setEditValue] = useState(textContent);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Determine if handlers are available (for conditional rendering)
  const hasEdit = !!(legacyOnEdit || (messageId && onEditMessage));
  const hasDelete = !!(legacyOnDelete || (messageId && onDeleteMessage));
  const hasPreviousBranch = !!(
    legacyOnPreviousBranch ||
    (messageId && onPreviousBranchMessage)
  );
  const hasNextBranch = !!(
    legacyOnNextBranch ||
    (messageId && onNextBranchMessage)
  );

  // Create stable callbacks bound to messageId (or use legacy props if provided)
  const onEdit = useCallback(
    (newContent: string) => {
      if (legacyOnEdit) {
        legacyOnEdit(newContent);
      } else if (messageId && onEditMessage) {
        onEditMessage(messageId, newContent);
      }
    },
    [messageId, onEditMessage, legacyOnEdit],
  );

  const onDelete = useCallback(() => {
    if (legacyOnDelete) {
      legacyOnDelete();
    } else if (messageId && onDeleteMessage) {
      onDeleteMessage(messageId);
    }
  }, [messageId, onDeleteMessage, legacyOnDelete]);

  const onPreviousBranch = useCallback(() => {
    if (legacyOnPreviousBranch) {
      legacyOnPreviousBranch();
    } else if (messageId && onPreviousBranchMessage) {
      onPreviousBranchMessage(messageId);
    }
  }, [messageId, onPreviousBranchMessage, legacyOnPreviousBranch]);

  const onNextBranch = useCallback(() => {
    if (legacyOnNextBranch) {
      legacyOnNextBranch();
    } else if (messageId && onNextBranchMessage) {
      onNextBranchMessage(messageId);
    }
  }, [messageId, onNextBranchMessage, legacyOnNextBranch]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      // Auto-resize
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [textContent, onCopy]);

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
        <div className="max-w-[90%] w-full">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === "Escape") {
                  handleCancelEdit();
                }
              }}
              className={cn(
                "w-full px-4 py-3.5 rounded-xl resize-none",
                "border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850",
                "text-base leading-relaxed",
              )}
              rows={1}
            />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={handleCancelEdit}>
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
      className="group/message w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out select-none"
      data-role="user"
    >
      <div className="flex w-full items-start gap-2 sm:gap-2.5 justify-end">
        {/* Actions - show on hover */}
        <div className={cn(
          "self-center flex items-center gap-1 transition-opacity duration-200",
          "opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100"
        )}>
          <MessageActions
            onCopy={handleCopy}
            onEdit={hasEdit ? handleStartEdit : undefined}
            onDelete={hasDelete ? onDelete : undefined}
            isUser
            branchInfo={branchInfo}
            onPreviousBranch={hasPreviousBranch ? onPreviousBranch : undefined}
            onNextBranch={hasNextBranch ? onNextBranch : undefined}
          />
          {copied && (
            <span className="text-xs text-status-success-text animate-in fade-in">
              Copied!
            </span>
          )}
        </div>

        {/* Message content */}
        <div className="flex flex-col items-end max-w-[90%] sm:max-w-[min(fit-content,80%)]">
          {/* Attachments/Images */}
          {images.length > 0 && (
            <div className="flex flex-row justify-end gap-2 mb-2">
              {images.map((src, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-lg">
                  <img
                    src={src}
                    alt={`Attached image ${idx + 1}`}
                    className={cn(
                      "max-h-64 max-w-full object-contain rounded-lg",
                      "cursor-pointer transition-transform hover:scale-[1.02]",
                    )}
                    onClick={() => window.open(src, "_blank")}
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
                    "flex items-center gap-2 px-3 py-2 rounded-lg",
                    "bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors",
                    "text-sm text-gray-900 dark:text-gray-100",
                  )}
                >
                  <HugeiconsIcon icon={FileAttachmentIcon} className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="truncate max-w-[200px]">{doc.fileName}</span>
                </a>
              ))}
            </div>
          )}

          {/* Text bubble - Premium robust appearance */}
          {textContent && (
            <div className={cn(
              "inline-block w-fit px-5 py-3 text-left select-text transition-all duration-200 shadow-sm",
              // Unified Material Gray Style (no more blue)
              "rounded-[22px] rounded-br-[8px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-850 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md"
            )}>
              <span className={cn(
                "whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed tracking-normal font-medium",
                "text-gray-900 dark:text-gray-100"
              )}>
                {textContent}
              </span>
            </div>
          )}
          {edited && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              edited
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
