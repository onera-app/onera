import { memo, type MouseEvent, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, Pin, PinOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ModelOption } from "@/lib/ai";

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

  const handleTogglePin = useCallback(
    (e: MouseEvent) => {
      onTogglePin(model.id, e);
    },
    [onTogglePin, model.id],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(model.id);
      }
    },
    [onSelect, model.id],
  );

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      data-model-item
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full flex items-center gap-2 mx-1.5 px-2 py-1.5 rounded-md text-left text-[13px] group cursor-pointer",
        "transition-colors duration-100",
        // Use foreground opacity for theme-aware colors
        isHighlighted && "bg-foreground/10",
        isSelected && !isHighlighted && "bg-foreground/[0.06]",
        !isHighlighted && !isSelected && "hover:bg-foreground/[0.06]",
      )}
      style={{ width: "calc(100% - 12px)" }}
    >
      {/* Model name */}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "truncate block",
            isSelected ? "text-foreground font-medium" : "text-foreground/80",
          )}
        >
          {model.name}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Pin button - only visible on hover or if pinned */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleTogglePin}
              className={cn(
                "h-6 w-6 flex items-center justify-center rounded transition-all duration-100",
                isPinned
                  ? "opacity-100 text-amber-500 hover:text-amber-600 hover:bg-foreground/10"
                  : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-foreground/10",
              )}
            >
              {isPinned ? (
                <PinOff className="h-3 w-3" />
              ) : (
                <Pin className="h-3 w-3" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            {isPinned ? "Unpin" : "Pin"}
          </TooltipContent>
        </Tooltip>

        {/* Selected checkmark - Apple style: simple, clean */}
        <div className="w-5 flex items-center justify-center">
          {isSelected && (
            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
          )}
        </div>
      </div>
    </div>
  );
});
