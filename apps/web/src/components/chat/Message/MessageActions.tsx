import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Pencil, Trash2 } from 'lucide-react';
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
              className="text-muted-foreground hover:text-foreground rounded-xl hover:bg-[var(--chat-muted)]"
            >
              <Copy className="h-4 w-4" />
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
              className="text-muted-foreground hover:text-foreground rounded-xl hover:bg-[var(--chat-muted)]"
            >
              <Pencil className="h-4 w-4" />
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
              className="text-muted-foreground hover:text-destructive rounded-xl hover:bg-[var(--chat-muted)]"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
