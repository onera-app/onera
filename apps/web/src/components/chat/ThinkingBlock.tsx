/**
 * ThinkingBlock Component
 * Renders AI thinking/reasoning content in a collapsible block
 * Inspired by open-webui's implementation
 */

import { useState, memo } from 'react';
import { ChevronRight, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatThinkingDuration, type ThinkingBlock as ThinkingBlockData } from '@/lib/parseThinkingBlocks';

// Re-export the type for consumers
export type { ThinkingBlockData as ThinkingBlock };

interface ThinkingBlockProps {
  block: ThinkingBlockData;
  defaultOpen?: boolean;
}

export const ThinkingBlockItem = memo(function ThinkingBlockItem({
  block,
  defaultOpen = false,
}: ThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mb-4 rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
          {block.isComplete ? (
            <>
              <Brain className="h-4 w-4 shrink-0 text-primary/70" />
              <span className="font-medium">
                {block.duration !== undefined
                  ? formatThinkingDuration(block.duration)
                  : 'Thought process'}
              </span>
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <span className="font-medium">Thinking...</span>
            </>
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50 px-4 py-3">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
              {block.content || (
                <span className="italic opacity-60">Processing...</span>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

interface ThinkingBlocksProps {
  blocks: ThinkingBlockData[];
  defaultOpen?: boolean;
}

export const ThinkingBlocks = memo(function ThinkingBlocks({
  blocks,
  defaultOpen = false,
}: ThinkingBlocksProps) {
  if (blocks.length === 0) return null;

  return (
    <div className="thinking-blocks">
      {blocks.map((block) => (
        <ThinkingBlockItem key={block.id} block={block} defaultOpen={defaultOpen} />
      ))}
    </div>
  );
});
