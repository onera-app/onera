import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import { MessageActions } from './MessageActions';
import { cn, formatModelName } from '@/lib/utils';
import { Sources, type Source } from '../Sources';
import { ToolInvocations, type ToolInvocationData } from '../ToolInvocation';
import { MessageMetadata } from '../MessageMetadata';
import { MessageReasoning } from '../MessageReasoning';
import { parseThinkingBlocks, hasThinkingContent, type ThinkingBlock } from '@/lib/parseThinkingBlocks';
import type { BranchInfo } from './BranchNavigation';
import type { MessagePart, ToolInvocationPart, SourcePart, MessageMetadata as MessageMetadataType } from '../Messages';

// Sparkles icon from Vercel AI Chatbot
const SparklesIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: 'currentcolor' }}
    viewBox="0 0 16 16"
    width={size}
  >
    <path
      d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
      fill="currentColor"
    />
    <path
      d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
      fill="currentColor"
    />
    <path
      d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
      fill="currentColor"
    />
  </svg>
);

export interface RegenerateOptions {
  modifier?: string;
}

interface AssistantMessageProps {
  content: string;
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
  onRegenerate?: (options?: RegenerateOptions) => void;
  onDelete?: () => void;
  branchInfo?: BranchInfo | null;
  onPreviousBranch?: () => void;
  onNextBranch?: () => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  content,
  parts,
  metadata,
  sources: externalSources,
  model,
  isLoading,
  onCopy,
  onRegenerate,
  onDelete,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const streamingStartRef = useRef<number | null>(null);

  // Track when streaming starts for duration calculation
  useEffect(() => {
    if (isLoading && !streamingStartRef.current) {
      streamingStartRef.current = Date.now();
    } else if (!isLoading) {
      streamingStartRef.current = null;
    }
  }, [isLoading]);

  // Extract all content types from parts
  const { displayContent, thinkingBlocks, isThinking, sources, toolInvocations } = useMemo(() => {
    // Default values
    let displayText = content;
    let blocks: ThinkingBlock[] = [];
    let thinking = false;
    const extractedSources: Source[] = [];
    const extractedTools: ToolInvocationData[] = [];

    // If we have AI SDK parts, extract everything from them
    if (parts && parts.length > 0) {
      const reasoningParts = parts.filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning');
      const textParts = parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
      const sourceParts = parts.filter((p): p is SourcePart => p.type === 'source');
      const toolParts = parts.filter((p): p is ToolInvocationPart => p.type === 'tool-invocation');

      displayText = textParts.map(p => p.text).join('');

      // Extract thinking/reasoning blocks
      if (reasoningParts.length > 0) {
        blocks = reasoningParts.map((p, i) => {
          const duration = !isLoading && streamingStartRef.current
            ? Math.round((Date.now() - streamingStartRef.current) / 1000)
            : undefined;
          return {
            id: `reasoning-${i}`,
            content: p.text,
            isComplete: !isLoading,
            duration,
          };
        });

        thinking = !!(isLoading && reasoningParts.some(p => p.text.length > 0) && textParts.every(p => !p.text));
      }

      // Extract sources
      for (const sp of sourceParts) {
        if (sp.source?.url) {
          extractedSources.push({
            sourceType: sp.source.sourceType || 'url',
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
      const parsed = parseThinkingBlocks(content, streamingStartRef.current || undefined);
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
  const reasoningText = thinkingBlocks.map(b => b.content).join('\n\n');
  const hasReasoning = reasoningText.trim().length > 0;

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role="assistant"
    >
      <div className="flex w-full items-start gap-2 md:gap-3 justify-start">
        {/* Avatar with Sparkles icon */}
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <div className={cn(isLoading && 'animate-pulse')}>
            <SparklesIcon size={14} />
          </div>
        </div>

        {/* Message content */}
        <div className={cn(
          'flex flex-col w-full',
          displayContent || toolInvocations.length > 0 || hasReasoning ? 'gap-2 md:gap-4' : ''
        )}>
          {/* Model name indicator */}
          {name && (
            <span className="text-xs font-medium text-muted-foreground">
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
            <div className={cn(
              'bg-transparent px-0 py-0 text-left',
              isLoading && 'streaming-cursor'
            )}>
              <Streamdown>{displayContent}</Streamdown>
            </div>
          ) : isLoading && !hasReasoning ? (
            <ThinkingMessage />
          ) : null}

          {/* Sources/Citations */}
          {!isLoading && sources.length > 0 && (
            <Sources sources={sources} />
          )}

          {/* Actions and Metadata */}
          {!isLoading && content && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 opacity-50 group-hover/message:opacity-100 transition-opacity duration-200">
                <MessageActions
                  onCopy={handleCopy}
                  onRegenerate={onRegenerate}
                  onDelete={onDelete}
                  isUser={false}
                  branchInfo={branchInfo}
                  onPreviousBranch={onPreviousBranch}
                  onNextBranch={onNextBranch}
                />
                {copied && (
                  <span className="text-xs text-status-success-text ml-2 animate-in fade-in">Copied!</span>
                )}
              </div>
              {/* Token usage and metadata */}
              {metadata && (
                <MessageMetadata metadata={metadata} className="opacity-0 group-hover/message:opacity-100 transition-opacity duration-200" />
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
 */
export const ThinkingMessage = () => {
  return (
    <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
      <span className="animate-pulse">Thinking</span>
      <span className="inline-flex">
        <span className="animate-bounce [animation-delay:0ms]">.</span>
        <span className="animate-bounce [animation-delay:150ms]">.</span>
        <span className="animate-bounce [animation-delay:300ms]">.</span>
      </span>
    </div>
  );
};
