/**
 * Attachment Button Component
 * Handles file selection via button click or drag-and-drop
 */

import { useRef, useCallback, type DragEvent } from 'react';
import { Paperclip, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_TEXT_TYPES,
} from '@/lib/fileProcessing';

interface AttachmentButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function AttachmentButton({
  onFilesSelected,
  disabled = false,
}: AttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        onFilesSelected(Array.from(files));
      }
      // Reset input to allow selecting the same file again
      event.target.value = '';
    },
    [onFilesSelected]
  );

  const handleSelectFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSelectImages = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const allAcceptedTypes = [
    ...SUPPORTED_IMAGE_TYPES,
    ...SUPPORTED_DOCUMENT_TYPES,
    ...SUPPORTED_TEXT_TYPES,
  ].join(',');

  const imageAcceptedTypes = SUPPORTED_IMAGE_TYPES.join(',');

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={allAcceptedTypes}
        multiple
        onChange={handleFileChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept={imageAcceptedTypes}
        multiple
        onChange={handleFileChange}
      />

      {/* Dropdown button */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Attach file</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleSelectImages}>
            <Image className="h-4 w-4 mr-2" />
            Upload image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSelectFiles}>
            <FileText className="h-4 w-4 mr-2" />
            Upload file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

/**
 * Drag and drop overlay component
 */
interface DragDropOverlayProps {
  isVisible: boolean;
}

export function DragDropOverlay({ isVisible }: DragDropOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl">
      <div className="flex flex-col items-center gap-2 text-primary">
        <Paperclip className="h-8 w-8" />
        <span className="text-sm font-medium">Drop files here</span>
      </div>
    </div>
  );
}

/**
 * Hook for handling drag and drop
 */
export function useDragAndDrop(onFilesDropped: (files: File[]) => void) {
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        onFilesDropped(Array.from(files));
      }
    },
    [onFilesDropped]
  );

  return {
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}
