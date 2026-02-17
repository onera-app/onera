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
      <div className="w-full max-w-6xl mx-auto font-primary">
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
    <div className="w-full max-w-6xl mx-auto font-primary">
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
 * Simple textarea-based message input — Open WebUI style
 */
const SimpleMessageInput = memo(function SimpleMessageInput({
  onSend,
  disabled = false,
  placeholder: _placeholder = "Message Onera...",
  onStop,
  isStreaming = false,
}: MessageInputProps) {
  void _placeholder;
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
    const pending: PendingAttachment[] = files.map((file) => ({
      id: uuidv4(),
      file,
      status: "processing" as const,
    }));

    setAttachments((prev) => [...prev, ...pending]);

    const results = await Promise.all(
      pending.map(async (entry) => {
        try {
          const processed = await processFile(entry.file!);

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

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

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

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

    setValue("");
    setAttachments([]);

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
      {/* Main input container — Open WebUI style */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 flex flex-col w-full shadow-lg rounded-3xl border transition px-1",
          "bg-white dark:bg-gray-500/5 text-gray-900 dark:text-gray-100",
          isFocused
            ? "border-gray-100 dark:border-gray-800"
            : "border-gray-100/30 dark:border-gray-850/30 hover:border-gray-200 dark:hover:border-gray-800",
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

        {/* Textarea — Open WebUI style */}
        <div className="px-2.5 pt-2.5 pb-1">
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
              "max-h-[96px] sm:max-h-[120px] min-h-[24px]",
              "text-base lg:text-lg leading-relaxed",
              "placeholder:text-gray-300 dark:placeholder:text-gray-600",
            )}
          />
        </div>

        {/* Bottom toolbar — Open WebUI style */}
        <div className="flex justify-between mt-0.5 mb-2.5 mx-0.5 max-w-full">
          {/* Left side: attach + divider + tools */}
          <div className="ml-1 self-end flex items-center flex-1 max-w-[80%] gap-[0.5px]">
            <AttachmentButton
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isStreaming}
            />
            <div className="flex self-center w-[1px] h-4 mx-1 bg-gray-200/50 dark:bg-gray-800/50" />
            <SearchToggle
              enabled={searchEnabled}
              onToggle={setSearchEnabled}
              selectedProvider={searchProvider}
              onProviderChange={setSearchProvider}
              isSearching={isSearching}
              disabled={disabled || isStreaming}
            />
          </div>

          {/* Right side: send button — Open WebUI primary action style */}
          <div className="self-end flex space-x-1 mr-1 shrink-0 gap-[0.5px]">
            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onStop}
                    className="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-full p-1.5 self-center"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Stop generating</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSend}
                    className={cn(
                      "transition rounded-full p-1.5 self-center",
                      canSend
                        ? "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                        : "text-gray-400 bg-gray-200 dark:text-gray-600 dark:bg-gray-700 cursor-not-allowed",
                    )}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                  </button>
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
