import { memo, type MouseEvent, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ModelOption } from '@/lib/ai';

interface ModelItemProps {
  model: ModelOption;
  isSelected: boolean;
  isHighlighted: boolean;
  isPinned: boolean;
  onSelect: (modelId: string) => void;
  onTogglePin: (modelId: string, e: MouseEvent) => void;
}

export const ModelItem = memo(function ModelItem({
  model,
  isSelected,
  isHighlighted,
  isPinned,
  onSelect,
  onTogglePin,
}: ModelItemProps) {
  const handleSelect = useCallback(() => {
    onSelect(model.id);
  }, [onSelect, model.id]);

  const handleTogglePin = useCallback((e: MouseEvent) => {
    onTogglePin(model.id, e);
  }, [onTogglePin, model.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(model.id);
    }
  }, [onSelect, model.id]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      data-model-item
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm group cursor-pointer',
        'transition-colors',
        isHighlighted && 'bg-accent',
        isSelected && !isHighlighted && 'bg-primary/10',
        !isHighlighted && !isSelected && 'hover:bg-accent'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{model.name}</div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Pin button - visible on hover or if pinned */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleTogglePin}
              className={cn(
                'h-7 w-7 transition-opacity',
                isPinned
                  ? 'opacity-100 text-amber-500'
                  : 'opacity-0 group-hover:opacity-100 text-muted-foreground'
              )}
            >
              {isPinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isPinned ? 'Unpin model' : 'Pin model'}
          </TooltipContent>
        </Tooltip>

        {/* Selected indicator */}
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </div>
    </div>
  );
});
