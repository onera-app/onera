import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Pencil,
} from "lucide-react";
import { RegenerateMenu } from './RegenerateMenu';

interface MessageActionsProps {
  onCopy: () => void;
  onRegenerate?: (options?: { modifier?: string }) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onSpeak?: () => void;
  isUser: boolean;
  branchInfo?: { current: number; total: number } | null;
  onPreviousBranch?: () => void;
  onNextBranch?: () => void;
}

export function MessageActions({
  onCopy,
  onRegenerate,
  onDelete,
  onEdit,
  onSpeak,
  isUser,
  branchInfo,
  onPreviousBranch,
  onNextBranch,
}: MessageActionsProps) {
  return (
    <div className="flex items-center gap-0.5 text-gray-400 dark:text-gray-500">
      {/* Branch Navigation */}
      {branchInfo && (branchInfo.total > 1) && (
        <div className="flex items-center gap-0.5 mr-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
            onClick={onPreviousBranch}
            disabled={!onPreviousBranch || branchInfo.current === 1}
            title="Previous version"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] font-medium min-w-[20px] text-center select-none">
            {branchInfo.current}/{branchInfo.total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md hover:bg-white dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
            onClick={onNextBranch}
            disabled={!onNextBranch || branchInfo.current === branchInfo.total}
            title="Next version"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Speak Button */}
      {onSpeak && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          onClick={onSpeak}
          title="Read aloud"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Copy Button */}
      {onCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCopy}
              className="h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      )}

      {/* Edit Button */}
      {onEdit && isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      )}

      {/* Regenerate Button */}
      {onRegenerate && !isUser && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center">
              <RegenerateMenu onRegenerate={onRegenerate} />
            </span>
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      )}

      {/* Delete Button */}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
