import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
            className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Previous version</TooltipContent>
      </Tooltip>

      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums min-w-[2.5rem] text-center">
        {current} / {total}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className="h-6 w-6 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Next version</TooltipContent>
      </Tooltip>
    </div>
  );
}
