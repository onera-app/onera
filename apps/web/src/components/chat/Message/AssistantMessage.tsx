import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { MessageActions } from "./MessageActions";
import { cn, formatModelName } from "@/lib/utils";
import { Sources, type Source } from "../Sources";
import { ToolInvocations, type ToolInvocationData } from "../ToolInvocation";
import { MessageMetadata } from "../MessageMetadata";
import { MessageReasoning } from "../MessageReasoning";
import { LLMIcon } from "@/components/ui/llm-icon";
import {
  parseThinkingBlocks,
  hasThinkingContent,
  type ThinkingBlock,
} from "@/lib/parseThinkingBlocks";
import type { BranchInfo } from "./BranchNavigation";
import type {
  MessagePart,
  ToolInvocationPart,
  SourcePart,
  MessageMetadata as MessageMetadataType,
} from "../Messages";

export interface RegenerateOptions {
  modifier?: string;
}

interface AssistantMessageProps {
  content: string;
  /** Message ID for callback binding */
  messageId?: string;
  /** AI SDK message parts - used for extracting reasoning, sources, tools from middleware */
  parts?: MessagePart[];
  /** Message metadata (token usage, latency, etc.) */
  metadata?: MessageMetadataType;
  /** External sources (e.g., from web search) */
  sources?: Source[];
  model?: string;
  /** Whether this message is currently loading/streaming (Vercel pattern naming) */
  isLoading?: boolean;
  onCopy?: () => void;
  /** Raw regenerate handler - will be bound to messageId internally */
  onRegenerateMessage?: (
    messageId: string,
    options?: RegenerateOptions,
  ) => void;
  /** Raw delete handler - will be bound to messageId internally */
  onDeleteMessage?: (messageId: string) => void;
  /** Raw branch handlers - will be bound to messageId internally */
  onPreviousBranchMessage?: (messageId: string) => void;
  onNextBranchMessage?: (messageId: string) => void;
  branchInfo?: BranchInfo | null;
  /** @deprecated Use onRegenerateMessage with messageId instead */
  onRegenerate?: (options?: RegenerateOptions) => void;
  /** @deprecated Use onDeleteMessage with messageId instead */
  onDelete?: () => void;
  /** @deprecated Use onPreviousBranchMessage with messageId instead */
  onPreviousBranch?: () => void;
  /** @deprecated Use onNextBranchMessage with messageId instead */
  onNextBranch?: () => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  content,
  messageId,
  parts,
  metadata,
  sources: externalSources,
  model,
  isLoading,
  onCopy,
  onRegenerateMessage,
  onDeleteMessage,
  onPreviousBranchMessage,
  onNextBranchMessage,
  branchInfo,
  // Legacy props for backward compatibility
  onRegenerate: legacyOnRegenerate,
  onDelete: legacyOnDelete,
  onPreviousBranch: legacyOnPreviousBranch,
  onNextBranch: legacyOnNextBranch,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const streamingStartRef = useRef<number | null>(null);

  // Determine if handlers are available (for conditional rendering)
  const hasRegenerate = !!(
    legacyOnRegenerate ||
    (messageId && onRegenerateMessage)
  );
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
  const onRegenerate = useCallback(
    (options?: RegenerateOptions) => {
      if (legacyOnRegenerate) {
        legacyOnRegenerate(options);
      } else if (messageId && onRegenerateMessage) {
        onRegenerateMessage(messageId, options);
      }
    },
    [messageId, onRegenerateMessage, legacyOnRegenerate],
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

  // Track when streaming starts for duration calculation
  useEffect(() => {
    if (isLoading && !streamingStartRef.current) {
      streamingStartRef.current = Date.now();
    } else if (!isLoading) {
      streamingStartRef.current = null;
    }
  }, [isLoading]);

  // Extract all content types from parts
  const {
    displayContent,
    thinkingBlocks,
    isThinking,
    sources,
    toolInvocations,
  } = useMemo(() => {
    // Default values
    let displayText = content;
    let blocks: ThinkingBlock[] = [];
    let thinking = false;
    const extractedSources: Source[] = [];
    const extractedTools: ToolInvocationData[] = [];

    // If we have AI SDK parts, extract everything from them
    if (parts && parts.length > 0) {
      const reasoningParts = parts.filter(
        (p): p is { type: "reasoning"; text: string } => p.type === "reasoning",
      );
      const textParts = parts.filter(
        (p): p is { type: "text"; text: string } => p.type === "text",
      );
      const sourceParts = parts.filter(
        (p): p is SourcePart => p.type === "source",
      );
      const toolParts = parts.filter(
        (p): p is ToolInvocationPart => p.type === "tool-invocation",
      );

      displayText = textParts.map((p) => p.text).join("");

      // Extract thinking/reasoning blocks
      if (reasoningParts.length > 0) {
        blocks = reasoningParts.map((p, i) => {
          const duration =
            !isLoading && streamingStartRef.current
              ? Math.round((Date.now() - streamingStartRef.current) / 1000)
              : undefined;
          return {
            id: `reasoning-${i}`,
            content: p.text,
            isComplete: !isLoading,
            duration,
          };
        });

        thinking = !!(
          isLoading &&
          reasoningParts.some((p) => p.text.length > 0) &&
          textParts.every((p) => !p.text)
        );
      }

      // Extract sources
      for (const sp of sourceParts) {
        if (sp.source?.url) {
          extractedSources.push({
            sourceType: sp.source.sourceType || "url",
            url: sp.source.url,
            title: sp.source.title,
            domain: sp.source.domain,
          });
        }
      }

      // Extract tool invocations
      for (const tp of toolParts) {
        extractedTools.push({
          toolCallId: tp.toolCallId,
          toolName: tp.toolName,
          args: tp.args,
          result: tp.result,
          state: tp.state,
          errorText: tp.errorText,
        });
      }
    } else if (content && hasThinkingContent(content)) {
      // Fall back to custom parsing for content with thinking tags
      const parsed = parseThinkingBlocks(
        content,
        streamingStartRef.current || undefined,
      );
      displayText = parsed.displayContent;
      blocks = parsed.thinkingBlocks;
      thinking = parsed.isThinking;
    }

    // Merge external sources (from web search) with sources from AI SDK parts
    const allSources = [...extractedSources, ...(externalSources || [])];

    return {
      displayContent: displayText,
      thinkingBlocks: blocks,
      isThinking: thinking,
      sources: allSources,
      toolInvocations: extractedTools,
    };
  }, [content, parts, isLoading, externalSources]);

  const handleCopy = useCallback(async () => {
    // Copy the display content (without thinking blocks)
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [displayContent, onCopy]);

  const name = formatModelName(model);

  // Combine thinking blocks into a single reasoning string for the new component
  const reasoningText = thinkingBlocks.map((b) => b.content).join("\n\n");
  const hasReasoning = reasoningText.trim().length > 0;

  return (
    <div
      className="group/message w-full animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out"
      data-role="assistant"
    >
      <div className="flex w-full items-start gap-3 sm:gap-3.5 justify-start">
        {/* Avatar with provider icon */}
        <LLMIcon
          model={model}
          size="md"
          isLoading={isLoading}
          className="flex-shrink-0 mt-0.5"
        />

        {/* Message content */}
        <div
          className={cn(
            "flex flex-col w-full min-w-0",
            displayContent || toolInvocations.length > 0 || hasReasoning
              ? "gap-3 sm:gap-4"
              : "",
          )}
        >
          {/* Model name indicator */}
          {name && (
            <span className="text-xs font-medium text-muted-foreground/70 tracking-[-0.01em]">
              {name}
            </span>
          )}

          {/* Reasoning/Thinking block */}
          {hasReasoning && (
            <MessageReasoning
              isLoading={Boolean(isLoading && isThinking)}
              reasoning={reasoningText}
            />
          )}

          {/* Tool invocations */}
          <ToolInvocations tools={toolInvocations} />

          {/* Main content */}
          {displayContent ? (
            <div
              className={cn(
                "text-left transition-opacity duration-200 text-base lg:text-lg leading-[1.65] tracking-[-0.01em] text-foreground/95",
                isLoading && "streaming-cursor",
              )}
            >
              <Streamdown>{displayContent}</Streamdown>
            </div>
          ) : isLoading && !hasReasoning ? (
            <div className="animate-in fade-in duration-300">
              <ThinkingMessage />
            </div>
          ) : null}

          {/* Sources/Citations */}
          {!isLoading && sources.length > 0 && <Sources sources={sources} />}

          {/* Actions and Metadata */}
          {!isLoading && content && (
            <div className="flex items-center justify-between flex-wrap gap-2 mt-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
              <div className="flex items-center gap-1">
                <MessageActions
                  onCopy={handleCopy}
                  onRegenerate={hasRegenerate ? onRegenerate : undefined}
                  onDelete={hasDelete ? onDelete : undefined}
                  isUser={false}
                  branchInfo={branchInfo}
                  onPreviousBranch={
                    hasPreviousBranch ? onPreviousBranch : undefined
                  }
                  onNextBranch={hasNextBranch ? onNextBranch : undefined}
                />
                {copied && (
                  <span className="text-xs text-emerald-500 ml-1.5 animate-in fade-in">
                    Copied!
                  </span>
                )}
              </div>
              {/* Token usage and metadata */}
              {metadata && (
                <MessageMetadata
                  metadata={metadata}
                  className="hidden sm:flex"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/**
 * ThinkingMessage - shown while waiting for initial response
 * Apple-style minimal typing indicator with gentle pulsing dots
 */
export const ThinkingMessage = () => {
  return (
    <div className="flex items-center h-5 text-muted-foreground/40">
      <span className="inline-flex items-center gap-1">
        <span
          className="w-[5px] h-[5px] bg-current rounded-full typing-dot"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-[5px] h-[5px] bg-current rounded-full typing-dot"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-[5px] h-[5px] bg-current rounded-full typing-dot"
          style={{ animationDelay: "300ms" }}
        />
      </span>
    </div>
  );
};
