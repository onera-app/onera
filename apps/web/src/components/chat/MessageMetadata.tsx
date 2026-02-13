/**
 * MessageMetadata Component
 * Displays token usage and other metadata for AI responses
 */

import { memo } from 'react';
import { Clock, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface MessageMetadataInfo {
  model?: string;
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  finishReason?: string;
}

interface MessageMetadataProps {
  metadata: MessageMetadataInfo;
  className?: string;
}

function formatTokenCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export const MessageMetadata = memo(function MessageMetadata({
  metadata,
  className,
}: MessageMetadataProps) {
  const { totalTokens, promptTokens, completionTokens, latencyMs } = metadata;

  // Don't render if no useful metadata
  if (!totalTokens && !latencyMs) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 text-xs text-muted-foreground/70 rounded-full px-2.5 py-1 chat-pill',
      className
    )}>
      {/* Token usage */}
      {totalTokens !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Hash className="h-3 w-3" />
              <span>{formatTokenCount(totalTokens)} tokens</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <div className="font-medium">Token Usage</div>
              {promptTokens !== undefined && (
                <div>Prompt: {formatTokenCount(promptTokens)}</div>
              )}
              {completionTokens !== undefined && (
                <div>Completion: {formatTokenCount(completionTokens)}</div>
              )}
              <div className="border-t border-border pt-1 mt-1">
                Total: {formatTokenCount(totalTokens)}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Latency */}
      {latencyMs !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <Clock className="h-3 w-3" />
              <span>{formatLatency(latencyMs)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Response time: {latencyMs}ms
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

export default MessageMetadata;
