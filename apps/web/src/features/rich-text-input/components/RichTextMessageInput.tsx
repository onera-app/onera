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
import { ArrowUp, Square, Mic } from "lucide-react";
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
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
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
          "focus:outline-none min-h-[24px] max-h-[120px]",
          "[&_p]:my-0 [&_code]:bg-gray-100 dark:[&_code]:bg-gray-850 [&_code]:px-1 [&_code]:rounded",
          "[&_pre]:bg-gray-100 dark:[&_pre]:bg-gray-850 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:text-base",
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

  // Voice Input
  const {
    isListening,
    transcript,
    start: startListening,
    stop: stopListening,
    reset: resetTranscript,
    supported: isSpeechSupported,
  } = useSpeechRecognition();

  // Store the initial editor content when listening starts
  // We can't just store the string because TipTap is complex HTML
  // But for simple appending, we can just insert the *new* part of the transcript

  // Actually, standard `useSpeechRecognition` returns the full `transcript`
  // We need to diff it or just append the final results. 
  // Let's use a ref to track the last inserted length to append only new parts?
  // Or simpler: just append the `transcript` to the editor when `isListening` is true?
  // But `transcript` grows from 0. 

  // Strategy:
  // 1. When listening starts, remember current cursor position or just focus.
  // 2. We will use a separate effect to handle `transcript` updates. 
  //    Since `transcript` is cumulative for the session, we need to replace the *previously inserted* voice text with the new `transcript`.
  //    This is tricky in TipTap.

  // Alternative Strategy (Simpler):
  // When `finalTranscript` updates in the hook, insert it and clear the hook's transcript? 
  // My hook doesn't support "clearing partials" easily without reset.

  // Let's modify the hook logic slightly in consumers:
  // Just track `transcript` length?

  const previousTranscriptRef = useRef("");

  useEffect(() => {
    if (!isListening) {
      previousTranscriptRef.current = "";
      return;
    }

    if (editor && transcript) {
      // Calculate the new part to insert
      const previous = previousTranscriptRef.current;
      const current = transcript;

      if (current.startsWith(previous)) {
        const newPart = current.slice(previous.length);
        if (newPart) {
          editor.commands.insertContent(newPart);
          previousTranscriptRef.current = current;
        }
      } else {
        // Did the transcript reset or change drastically?
        // Just insert the difference if possible, or maybe we just append everything if it's new
        // Ideally we'd replace the *previous insertion*, but that requires tracking a transaction/range.
        // For now, let's just append and relying on `continuous` to keep adding.
        // If the hook resets `transcript` on every final result, we are good. 
        // My hook *accumulates* final results.

        // Wait, my hook: `setTranscript(final + interim)`.
        // So `transcript` keeps growing.
        // `previousTranscriptRef` approach is correct for *appending* text as it comes in.
      }
    }
  }, [editor, transcript, isListening]);


  // Handle voice button click
  const handleVoiceClick = useCallback(() => {
    if (!isSpeechSupported) {
      toast.error("Voice input is not supported in this browser");
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      previousTranscriptRef.current = "";
      startListening();
      toast.info("Listening...", { duration: 2000 });
      editor?.commands.focus();
    }
  }, [isSpeechSupported, isListening, startListening, stopListening, resetTranscript, editor]);


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
          "relative rounded-3xl overflow-hidden bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850",
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

        {/* TipTap Editor */}
        <div className="w-full px-4 py-2.5">
          <EditorContent
            editor={editor}
            className={cn(
              "text-gray-900 dark:text-gray-100 leading-relaxed",
              disabled && "cursor-not-allowed",
            )}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
          <div className="flex items-center gap-1">
            <AttachmentButton
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isStreaming}
            />
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-800 mx-1" />
            <SearchToggle
              enabled={searchEnabled}
              onToggle={setSearchEnabled}
              selectedProvider={searchProvider}
              onProviderChange={setSearchProvider}
              isSearching={isSearching}
              disabled={disabled || isStreaming}
            />
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onStop}
                    size="icon"
                    className="h-10 w-10 lg:h-11 lg:w-11 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 transition-all duration-200 shadow-md"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Stop generating</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-1">
                {/* Voice Input Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleVoiceClick}
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-10 w-10 lg:h-11 lg:w-11 rounded-2xl transition-all duration-200",
                        isListening
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isListening ? "Stop listening" : "Voice input"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSend || disabled}
                      size="icon"
                      className={cn(
                        "h-10 w-10 lg:h-11 lg:w-11 rounded-2xl transition-all duration-200 shadow-md",
                        canSend && !disabled
                          ? "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 hover:scale-105"
                          : "bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 cursor-not-allowed",
                      )}
                    >
                      <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send message</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
