/**
 * Attachment Preview Component
 * Shows pending attachments before sending a message
 */

import { memo } from "react";
import { X, FileText, File, Loader2, AlertCircle, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessedFile } from "@/lib/fileProcessing";

export interface PendingAttachment {
  id: string;
  file?: File;
  processed?: ProcessedFile;
  status: "processing" | "ready" | "error";
  error?: string;
  preview?: string; // Data URL for images
}

interface AttachmentPreviewProps {
  attachments: PendingAttachment[];
  onRemove: (id: string) => void;
  className?: string;
}

export const AttachmentPreview = memo(function AttachmentPreview({
  attachments,
  onRemove,
  className,
}: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 mb-3", className)}>
      {attachments.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={() => onRemove(attachment.id)}
        />
      ))}
    </div>
  );
});

interface AttachmentItemProps {
  attachment: PendingAttachment;
  onRemove: () => void;
}

function AttachmentItem({ attachment, onRemove }: AttachmentItemProps) {
  const { status, error, preview, processed, file } = attachment;

  const fileName = processed?.fileName || file?.name || "Unknown";
  const fileType = processed?.type || "document";
  const isImage = fileType === "image";

  return (
    <div
      className={cn(
        "relative group rounded-lg border bg-gray-50 dark:bg-gray-850 overflow-hidden",
        status === "error" && "border-destructive",
        isImage ? "w-20 h-20" : "flex items-center gap-2 px-3 py-2 pr-8",
      )}
    >
      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "absolute z-10 h-5 w-5 rounded-full bg-white dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-900",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isImage ? "top-1 right-1" : "top-1/2 right-1.5 -translate-y-1/2",
        )}
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>

      {/* Content based on status and type */}
      {status === "processing" ? (
        <div
          className={cn(
            "flex items-center justify-center",
            isImage ? "w-full h-full" : "",
          )}
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          {!isImage && (
            <span className="text-xs text-muted-foreground ml-2 truncate max-w-[120px]">
              Processing...
            </span>
          )}
        </div>
      ) : status === "error" ? (
        <div
          className={cn(
            "flex items-center",
            isImage ? "w-full h-full justify-center" : "gap-2",
          )}
        >
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          {!isImage && (
            <span className="text-xs text-destructive truncate max-w-[120px]">
              {error || "Failed"}
            </span>
          )}
        </div>
      ) : isImage && preview ? (
        <img
          src={preview}
          alt={fileName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center gap-2">
          <FileIcon type={fileType} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate max-w-[120px]">
              {fileName}
            </span>
            {processed?.metadata?.pageCount && (
              <span className="text-micro text-muted-foreground">
                {processed.metadata.pageCount} pages
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4 text-primary flex-shrink-0" />;
    case "document":
      return <FileText className="h-4 w-4 text-primary flex-shrink-0" />;
    case "text":
      return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

/**
 * Attachment display in messages (after sending)
 */
interface MessageAttachmentProps {
  type: "image" | "document" | "text";
  fileName: string;
  dataUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    pageCount?: number;
  };
}

export function MessageAttachment({
  type,
  fileName,
  dataUrl,
  metadata,
}: MessageAttachmentProps) {
  if (type === "image" && dataUrl) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden max-w-md">
        <img
          src={dataUrl}
          alt={fileName}
          className="max-w-full h-auto max-h-[300px] object-contain"
        />
      </div>
    );
  }

  return (
    <div className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-850 border">
      <FileIcon type={type} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{fileName}</span>
        {metadata?.pageCount && (
          <span className="text-xs text-muted-foreground">
            {metadata.pageCount} pages
          </span>
        )}
      </div>
    </div>
  );
}
