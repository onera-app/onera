import {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  type KeyboardEvent,
  type DragEvent,
  type ClipboardEvent,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp, Square } from "lucide-react";
import { toast } from "sonner";
import { AttachmentButton, DragDropOverlay } from "./AttachmentButton";
import { AttachmentPreview, type PendingAttachment } from "./AttachmentPreview";
import { SearchToggle } from "./SearchToggle";
import { processFile } from "@/lib/fileProcessing";
import { useToolsStore } from "@/stores/toolsStore";
import { useUIStore } from "@/stores/uiStore";
import { RichTextMessageInput } from "@/features/rich-text-input";
import type { ProcessedFile } from "@/lib/fileProcessing";
import type { SearchProvider } from "@onera/types";

export interface MessageInputOptions {
  attachments?: ProcessedFile[];
  searchEnabled?: boolean;
  searchProvider?: SearchProvider;
}

interface MessageInputProps {
  onSend: (content: string, options?: MessageInputOptions) => void;
  disabled?: boolean;
  placeholder?: string;
  onStop?: () => void;
  isStreaming?: boolean;
}

export const MessageInput = memo(function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Message Onera...",
  onStop,
  isStreaming = false,
}: MessageInputProps) {
  // Check if rich text input is enabled
  const useRichTextInput = useUIStore((s) => s.useRichTextInput);

  // Use rich text input if enabled
  if (useRichTextInput) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <RichTextMessageInput
          onSend={onSend}
          disabled={disabled}
          placeholder={placeholder}
          onStop={onStop}
          isStreaming={isStreaming}
        />
      </div>
    );
  }

  // Fallback to simple textarea input
  return (
    <div className="w-full max-w-7xl mx-auto">
      <SimpleMessageInput
        onSend={onSend}
        disabled={disabled}
        placeholder={placeholder}
        onStop={onStop}
        isStreaming={isStreaming}
      />
    </div>
  );
});

/**
 * Simple textarea-based message input (legacy)
 */
const SimpleMessageInput = memo(function SimpleMessageInput({
  onSend,
  disabled = false,
  placeholder: _placeholder = "Message Onera...",
  onStop,
  isStreaming = false,
}: MessageInputProps) {
  // Note: We use a fixed placeholder "Send a Message" to match OpenWebUI style
  void _placeholder; // Suppress unused variable warning
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState<
    SearchProvider | undefined
  >();
  const [isSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize search state from store
  const searchEnabledByDefault = useToolsStore((s) => s.searchEnabledByDefault);
  const defaultSearchProvider = useToolsStore((s) => s.defaultSearchProvider);

  useEffect(() => {
    setSearchEnabled(searchEnabledByDefault);
    if (defaultSearchProvider) {
      setSearchProvider(defaultSearchProvider);
    }
  }, [searchEnabledByDefault, defaultSearchProvider]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Process files and add to attachments
  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Create pending entries
    const pending: PendingAttachment[] = files.map((file) => ({
      id: uuidv4(),
      file,
      status: "processing" as const,
    }));

    setAttachments((prev) => [...prev, ...pending]);

    // Process all files in parallel and collect results
    const results = await Promise.all(
      pending.map(async (entry) => {
        try {
          const processed = await processFile(entry.file!);

          // Generate preview for images
          let preview: string | undefined;
          if (processed.type === "image") {
            preview = `data:${processed.mimeType};base64,${processed.data}`;
          }

          return {
            id: entry.id,
            processed,
            preview,
            status: "ready" as const,
            error: undefined,
          };
        } catch (error) {
          toast.error(
            `Failed to process ${entry.file?.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          return {
            id: entry.id,
            processed: undefined,
            preview: undefined,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Processing failed",
          };
        }
      }),
    );

    // Batch update all results at once to avoid race conditions
    setAttachments((prev) =>
      prev.map((a) => {
        const result = results.find((r) => r.id === a.id);
        if (result) {
          return {
            ...a,
            processed: result.processed,
            preview: result.preview,
            status: result.status,
            error: result.error,
          };
        }
        return a;
      }),
    );
  }, []);

  // Remove an attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Handle paste for images
  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageItems.push(file);
          }
        }
      }

      if (imageItems.length > 0) {
        e.preventDefault();
        handleFilesSelected(imageItems);
      }
    },
    [handleFilesSelected],
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX <= rect.left ||
        clientX >= rect.right ||
        clientY <= rect.top ||
        clientY >= rect.bottom
      ) {
        setIsDragging(false);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        handleFilesSelected(Array.from(files));
      }
    },
    [handleFilesSelected],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    const readyAttachments = attachments.filter(
      (a) => a.status === "ready" && a.processed,
    );

    if (!trimmed && readyAttachments.length === 0) return;
    if (disabled) return;

    // Build options
    const options: MessageInputOptions = {};

    if (readyAttachments.length > 0) {
      options.attachments = readyAttachments.map((a) => a.processed!);
    }

    if (searchEnabled) {
      options.searchEnabled = true;
      if (searchProvider) {
        options.searchProvider = searchProvider;
      }
    }

    onSend(trimmed, Object.keys(options).length > 0 ? options : undefined);

    // Reset state
    setValue("");
    setAttachments([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, attachments, disabled, searchEnabled, searchProvider, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const readyAttachments = attachments.filter((a) => a.status === "ready");
  const canSend =
    (value.trim().length > 0 || readyAttachments.length > 0) && !disabled;

  return (
    <div className="relative w-full">
      {/* Main input container - OpenWebUI style */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-3xl overflow-hidden transition-all duration-200 chat-surface-elevated shadow-[0_10px_36px_rgba(28,28,30,0.14)]",
          isFocused && "ring-2 ring-[var(--chat-focus)]",
          disabled && "opacity-50",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag and drop overlay */}
        <DragDropOverlay isVisible={isDragging} />

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <AttachmentPreview
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </div>
        )}

        {/* Textarea at top - OpenWebUI style */}
        <div className="px-4 pt-4 pb-2">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Send a Message"
            disabled={disabled || isStreaming}
            rows={1}
            className={cn(
              "w-full bg-transparent resize-none border-0 shadow-none p-0",
              "disabled:cursor-not-allowed",
              "max-h-[150px] sm:max-h-[200px] min-h-[24px]",
              "text-base lg:text-lg leading-relaxed",
              "placeholder:text-muted-foreground text-foreground",
            )}
          />
        </div>

        {/* Bottom toolbar - OpenWebUI style */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left side: attach + separator + tools */}
          <div className="flex items-center gap-1">
            <AttachmentButton
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isStreaming}
            />
            <div className="w-px h-5 bg-[var(--chat-divider)] mx-1" />
            <SearchToggle
              enabled={searchEnabled}
              onToggle={setSearchEnabled}
              selectedProvider={searchProvider}
              onProviderChange={setSearchProvider}
              isSearching={isSearching}
              disabled={disabled || isStreaming}
            />
          </div>

          {/* Right side: send button */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onStop}
                    size="icon"
                    className="h-10 w-10 lg:h-11 lg:w-11 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop generating</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSend}
                    size="icon"
                    className={cn(
                      "h-10 w-10 lg:h-11 lg:w-11 rounded-full transition-colors",
                      canSend
                        ? "bg-foreground text-background hover:bg-foreground/90"
                        : "bg-[var(--chat-muted)] text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send message</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
