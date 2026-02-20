import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Delete02Icon, PencilIcon } from "@hugeicons/core-free-icons";
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BranchNavigation, type BranchInfo } from './BranchNavigation';
import { RegenerateMenu } from './RegenerateMenu';
import type { RegenerateOptions } from './AssistantMessage';

interface MessageActionsProps {
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: (options?: RegenerateOptions) => void;
  onDelete?: () => void;
  isUser?: boolean;
  className?: string;
  branchInfo?: BranchInfo | null;
  onPreviousBranch?: () => void;
  onNextBranch?: () => void;
}

export const MessageActions = memo(function MessageActions({
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
  isUser = false,
  className,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
}: MessageActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1',
        className
      )}
    >
      {/* Branch navigation */}
      <BranchNavigation
        branchInfo={branchInfo ?? null}
        onPrevious={onPreviousBranch}
        onNext={onNextBranch}
      />
      {onCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCopy}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850"
            >
              <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      )}

      {onEdit && isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850"
            >
              <HugeiconsIcon icon={PencilIcon} className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      )}

      {onRegenerate && !isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <RegenerateMenu onRegenerate={onRegenerate} />
            </span>
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDelete}
              className="text-gray-500 dark:text-gray-400 hover:text-destructive rounded-xl hover:bg-gray-100 dark:hover:bg-gray-850"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
