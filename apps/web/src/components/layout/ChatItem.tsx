import { Link, useParams } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock, MoreHorizontal, Pencil, Trash2, FolderMinus } from 'lucide-react';

interface ChatItemProps {
  id: string;
  title: string;
  updatedAt: number;
  isLocked?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onRemoveFromFolder?: () => void;
}

export function ChatItem({
  id,
  title,
  isLocked,
  onDelete,
  onRename,
  onRemoveFromFolder,
}: ChatItemProps) {
  const params = useParams({ strict: false });
  const currentChatId = (params as { chatId?: string }).chatId;
  const isActive = currentChatId === id;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTitle(title);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== title && onRename) {
      onRename(id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(title);
  };

  const handleDelete = () => {
    onDelete(id);
    setShowDeleteDialog(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'chat', id }));
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.className = 'px-3 py-2 bg-sidebar-accent rounded-xl text-sm text-sidebar-foreground shadow-lg max-w-[200px] truncate';
    dragImage.textContent = title.length > 30 ? title.slice(0, 30) + '...' : title;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);

    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  if (isEditing) {
    return (
      <div className="px-1 py-0.5">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
          onBlur={handleCancelEdit}
          className="w-full h-9 px-3 rounded-xl bg-sidebar-accent text-sm text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring/50 transition-all"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'relative group rounded-xl transition-all duration-150',
          isDragging && 'opacity-40 scale-[0.98]'
        )}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Link
          to="/app/c/$chatId"
          params={{ chatId: id }}
          className={cn(
            'flex items-center w-full py-2.5 px-3 rounded-xl text-secondary transition-all duration-150',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
              : 'text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          {/* Lock indicator */}
          {isLocked && (
            <Lock className="w-3.5 h-3.5 mr-2.5 flex-shrink-0 text-muted-foreground/70" />
          )}

          {/* Title */}
          <span className="flex-1 truncate text-left leading-snug" dir="auto">
            {title}
          </span>

          {/* Gradient fade */}
          <div
            className={cn(
              'absolute right-0 top-0 h-full w-16 bg-gradient-to-l pointer-events-none transition-opacity duration-150',
              isActive
                ? 'from-sidebar-accent via-sidebar-accent/80 to-transparent'
                : 'from-sidebar-background via-sidebar-background/80 to-transparent group-hover:from-sidebar-accent/50 group-hover:via-sidebar-accent/30'
            )}
          />

          {/* Menu trigger */}
          <div
            className={cn(
              'absolute right-1.5 top-1/2 -translate-y-1/2',
              'opacity-0 group-hover:opacity-100 transition-all duration-150'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-background/60 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleStartEdit} className="gap-2 text-secondary">
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                {onRemoveFromFolder && (
                  <DropdownMenuItem onClick={onRemoveFromFolder} className="gap-2 text-secondary">
                    <FolderMinus className="h-3.5 w-3.5" />
                    Remove from folder
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-secondary text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Link>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-secondary">
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-secondary"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
