import { useState, useCallback, memo, useMemo, useRef, useEffect } from 'react';
import { Streamdown } from 'streamdown';
import { MessageActions } from './MessageActions';
import { cn, getProviderStyle, formatModelName } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ThinkingBlocks, type ThinkingBlock } from '../ThinkingBlock';
import { Sources, type Source } from '../Sources';
import { ToolInvocations, type ToolInvocationData } from '../ToolInvocation';
import { MessageMetadata } from '../MessageMetadata';
import { parseThinkingBlocks, hasThinkingContent } from '@/lib/parseThinkingBlocks';
import type { BranchInfo } from './BranchNavigation';
import type { MessagePart, ToolInvocationPart, SourcePart, MessageMetadata as MessageMetadataType } from '../Messages';

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
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: (options?: RegenerateOptions) => void;
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
  isStreaming,
  onCopy,
  onRegenerate,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
}: AssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const streamingStartRef = useRef<number | null>(null);

  // Track when streaming starts for duration calculation
  useEffect(() => {
    if (isStreaming && !streamingStartRef.current) {
      streamingStartRef.current = Date.now();
    } else if (!isStreaming) {
      streamingStartRef.current = null;
    }
  }, [isStreaming]);

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
          const duration = !isStreaming && streamingStartRef.current
            ? Math.round((Date.now() - streamingStartRef.current) / 1000)
            : undefined;
          return {
            id: `reasoning-${i}`,
            content: p.text,
            isComplete: !isStreaming,
            duration,
          };
        });

        thinking = !!(isStreaming && reasoningParts.some(p => p.text.length > 0) && textParts.every(p => !p.text));
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
  }, [content, parts, isStreaming, externalSources]);

  const handleCopy = useCallback(async () => {
    // Copy the display content (without thinking blocks)
    await navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  }, [displayContent, onCopy]);

  const { letter, bgClass, textClass } = getProviderStyle(model);
  const name = formatModelName(model);

  return (
    <div className="group">
      {/* Model indicator */}
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar className="h-7 w-7">
          <AvatarFallback className={cn('text-xs font-semibold', bgClass, textClass)}>
            {letter}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {name}
          </span>
          {isStreaming && (
            <Badge variant="secondary" className="gap-1.5 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Thinking
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative pl-9">
        {/* Thinking blocks */}
        <ThinkingBlocks blocks={thinkingBlocks} />

        {/* Tool invocations */}
        <ToolInvocations tools={toolInvocations} />

        {/* Main content */}
        {displayContent ? (
          <div className={cn(isStreaming && 'streaming-cursor')}>
            <Streamdown>{displayContent}</Streamdown>
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-3 py-2">
            {/* Pulsing skeleton loader - open-webui style */}
            <span className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-primary animate-[pulse-size_1.5s_ease-in-out_infinite]" />
            </span>
            <span className="text-sm text-muted-foreground">
              {isThinking ? 'Thinking...' : 'Generating response...'}
            </span>
          </div>
        ) : null}

        {/* Sources/Citations */}
        {!isStreaming && sources.length > 0 && (
          <Sources sources={sources} />
        )}

        {/* Actions and Metadata */}
        {!isStreaming && content && (
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <MessageActions
                onCopy={handleCopy}
                onRegenerate={onRegenerate}
                isUser={false}
                branchInfo={branchInfo}
                onPreviousBranch={onPreviousBranch}
                onNextBranch={onNextBranch}
              />
              {copied && (
                <span className="text-xs text-green-600 dark:text-green-400 ml-2 animate-in fade-in">Copied!</span>
              )}
            </div>
            {/* Token usage and metadata */}
            {metadata && (
              <MessageMetadata metadata={metadata} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
