import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Pencil, RefreshCw, Trash2 } from 'lucide-react';

interface MessageActionsProps {
  onCopy?: () => void;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  isUser?: boolean;
  className?: string;
}

export function MessageActions({
  onCopy,
  onEdit,
  onRegenerate,
  onDelete,
  isUser = false,
  className,
}: MessageActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
    >
      {onCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCopy}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
              size="icon"
              onClick={onEdit}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
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
            <Button
              variant="ghost"
              size="icon"
              onClick={onRegenerate}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate</TooltipContent>
        </Tooltip>
      )}

      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
