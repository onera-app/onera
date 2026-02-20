import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, HashtagIcon } from "@hugeicons/core-free-icons";
import { memo } from 'react';
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
      'flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 rounded-full px-2.5 py-1 chat-pill',
      className
    )}>
      {/* Token usage */}
      {totalTokens !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <HugeiconsIcon icon={HashtagIcon} className="h-3 w-3" />
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
              <div className="border-t border-gray-100 dark:border-gray-850 pt-1 mt-1">
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
              <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
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


