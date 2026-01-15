import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BranchInfo {
  current: number;
  total: number;
}

interface BranchNavigationProps {
  branchInfo: BranchInfo | null;
  onPrevious?: () => void;
  onNext?: () => void;
  className?: string;
}

export function BranchNavigation({
  branchInfo,
  onPrevious,
  onNext,
  className,
}: BranchNavigationProps) {
  if (!branchInfo || branchInfo.total <= 1) {
    return null;
  }

  const { current, total } = branchInfo;
  const canGoPrevious = current > 1;
  const canGoNext = current < total;

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous version</TooltipContent>
      </Tooltip>

      <span className="text-xs font-medium text-muted-foreground tabular-nums min-w-[2.5rem] text-center">
        {current} / {total}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next version</TooltipContent>
      </Tooltip>
    </div>
  );
}
