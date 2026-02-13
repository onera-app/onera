import {
  useState,
  useRef,
  useCallback,
  useEffect,
  memo,
  type DragEvent,
  type ClipboardEvent,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import "tippy.js/dist/tippy.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp, Square } from "lucide-react";
import { toast } from "sonner";
import {
  AttachmentButton,
  DragDropOverlay,
} from "@/components/chat/AttachmentButton";
import {
  AttachmentPreview,
  type PendingAttachment,
} from "@/components/chat/AttachmentPreview";
import { SearchToggle } from "@/components/chat/SearchToggle";
import { processFile } from "@/lib/fileProcessing";
import { useToolsStore } from "@/stores/toolsStore";
import { useE2EE } from "@/providers/E2EEProvider";
import { useCredentials } from "@/hooks/queries/useCredentials";
import {
  decryptCredentialsWithMetadata,
  getAvailableModelsFromCredentials,
  type ModelOption,
  type PartiallyDecryptedCredential,
} from "@/lib/ai";
import { MentionList, type MentionListRef } from "./MentionList";
import type { ProcessedFile } from "@/lib/fileProcessing";
import type { SearchProvider } from "@onera/types";

export interface MessageInputOptions {
  attachments?: ProcessedFile[];
  searchEnabled?: boolean;
  searchProvider?: SearchProvider;
  mentionedModels?: string[];
}

interface RichTextMessageInputProps {
  onSend: (content: string, options?: MessageInputOptions) => void;
  disabled?: boolean;
  placeholder?: string;
  onStop?: () => void;
  isStreaming?: boolean;
}

export const RichTextMessageInput = memo(function RichTextMessageInput({
  onSend,
  disabled = false,
  placeholder = "Message Onera...",
  onStop,
  isStreaming = false,
}: RichTextMessageInputProps) {
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState<
    SearchProvider | undefined
  >();
  const [isSearching] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [editorHasContent, setEditorHasContent] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef(placeholder);

  // Keep placeholder ref in sync
  useEffect(() => {
    placeholderRef.current = placeholder;
  }, [placeholder]);

  // E2EE and credentials for model mentions
  const { isUnlocked } = useE2EE();
  const rawCredentials = useCredentials();

  // Load models for @mentions
  useEffect(() => {
    async function loadModels() {
      if (!rawCredentials || rawCredentials.length === 0 || !isUnlocked) {
        setModels([]);
        return;
      }

      try {
        const partial: PartiallyDecryptedCredential[] = rawCredentials.map(
          (c) => ({
            id: c.id,
            provider: c.provider,
            name: c.name,
            encryptedData: c.encryptedData,
            iv: c.iv,
          }),
        );
        const decrypted = decryptCredentialsWithMetadata(partial);
        const availableModels =
          await getAvailableModelsFromCredentials(decrypted);
        setModels(availableModels);
      } catch (err) {
        console.error("Failed to load models for mentions:", err);
        setModels([]);
      }
    }

    loadModels();
  }, [rawCredentials, isUnlocked]);

  // Initialize search state from store
  const searchEnabledByDefault = useToolsStore((s) => s.searchEnabledByDefault);
  const defaultSearchProvider = useToolsStore((s) => s.defaultSearchProvider);

  useEffect(() => {
    setSearchEnabled(searchEnabledByDefault);
    if (defaultSearchProvider) {
      setSearchProvider(defaultSearchProvider);
    }
  }, [searchEnabledByDefault, defaultSearchProvider]);

  // Create TipTap editor with mention support
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
        emptyEditorClass: "is-editor-empty",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention bg-primary/20 text-primary px-1 rounded font-medium",
        },
        suggestion: {
          char: "@",
          items: ({ query }) => {
            return models
              .filter(
                (model) =>
                  model.name.toLowerCase().includes(query.toLowerCase()) ||
                  model.provider.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 10);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: Instance[] | null = null;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "top-start",
                  theme: "mention-dropdown",
                });
              },

              onUpdate(props) {
                component?.updateProps(props);

                if (!props.clientRect) return;

                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },

              onExit() {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-base dark:prose-invert max-w-none",
          "focus:outline-none min-h-[24px] max-h-[200px]",
          "[&_p]:my-0 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded",
          "[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:text-base",
          "overflow-y-auto",
        ),
      },
      handleKeyDown: (_view, event) => {
        // Submit on Enter (without shift)
        if (event.key === "Enter" && !event.shiftKey) {
          // Don't submit if suggestions are visible
          const suggestionPopup = document.querySelector(".tippy-box");
          if (suggestionPopup) {
            return false;
          }
          event.preventDefault();
          handleSubmit();
          return true;
        }
        return false;
      },
    },
    // Track content changes to update canSend state
    onUpdate: ({ editor }) => {
      setEditorHasContent(!editor.isEmpty);
    },
  });

  // Focus editor on mount
  useEffect(() => {
    if (editor) {
      setTimeout(() => editor.commands.focus(), 0);
    }
  }, [editor]);

  // Force editor to re-render when placeholder changes (ref is already updated above)
  useEffect(() => {
    if (editor && editor.view) {
      // Dispatch empty transaction to force placeholder decoration to re-render
      editor.view.dispatch(editor.state.tr);
    }
  }, [editor, placeholder]);

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

  // Remove an attachment
  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Handle paste for images
  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLDivElement>) => {
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

  // Extract mentioned models from editor content
  const extractMentionedModels = useCallback((): string[] => {
    if (!editor) return [];
    const mentions: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === "mention") {
        mentions.push(node.attrs.id);
      }
    });
    return mentions;
  }, [editor]);

  const handleSubmit = useCallback(() => {
    if (!editor) return;

    const text = editor.getText().trim();
    const readyAttachments = attachments.filter(
      (a) => a.status === "ready" && a.processed,
    );

    if (!text && readyAttachments.length === 0) return;
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

    // Extract mentioned models
    const mentionedModels = extractMentionedModels();
    if (mentionedModels.length > 0) {
      options.mentionedModels = mentionedModels;
    }

    onSend(text, Object.keys(options).length > 0 ? options : undefined);

    // Reset state
    editor.commands.clearContent();
    setAttachments([]);
    setEditorHasContent(false);
  }, [
    editor,
    attachments,
    disabled,
    searchEnabled,
    searchProvider,
    onSend,
    extractMentionedModels,
  ]);

  const readyAttachments = attachments.filter((a) => a.status === "ready");
  const canSend = editorHasContent || readyAttachments.length > 0;

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Main input container */}
      <div
        ref={containerRef}
        className={cn(
          "relative rounded-3xl overflow-hidden chat-surface-elevated",
          "shadow-[0_10px_36px_rgba(28,28,30,0.14)]",
          "transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-[var(--chat-focus)]",
          disabled && "opacity-60",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {/* Drag and drop overlay */}
        <DragDropOverlay isVisible={isDragging} />

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="px-4 pt-3">
            <AttachmentPreview
              attachments={attachments}
              onRemove={handleRemoveAttachment}
            />
          </div>
        )}

        {/* Editor row */}
        <div className="flex items-end">
          {/* TipTap Editor */}
          <div className="flex-1 w-full px-4 py-4">
            <EditorContent
              editor={editor}
              className={cn(
                "text-body leading-relaxed",
                disabled && "cursor-not-allowed",
              )}
            />
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 pr-3 pb-3">
            {/* Attach file button */}
            <AttachmentButton
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isStreaming}
            />

            {/* Search toggle */}
            <SearchToggle
              enabled={searchEnabled}
              onToggle={setSearchEnabled}
              selectedProvider={searchProvider}
              onProviderChange={setSearchProvider}
              isSearching={isSearching}
              disabled={disabled || isStreaming}
            />

            {/* Send/Stop button */}
            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onStop}
                    size="icon"
                    className="h-10 w-10 lg:h-11 lg:w-11 rounded-2xl bg-foreground text-background hover:bg-foreground/90 transition-all duration-200 shadow-md"
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
                    disabled={!canSend || disabled}
                    size="icon"
                    className={cn(
                      "h-10 w-10 lg:h-11 lg:w-11 rounded-2xl transition-all duration-200 shadow-md",
                      canSend && !disabled
                        ? "bg-foreground text-background hover:bg-foreground/90 hover:scale-105"
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
