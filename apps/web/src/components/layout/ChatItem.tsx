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
import { Lock, MoreHorizontal, Pencil, Trash2, FolderMinus, Pin, PinOff } from 'lucide-react';

interface ChatItemProps {
  id: string;
  title: string;
  updatedAt: number;
  isLocked?: boolean;
  isPinned?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onRemoveFromFolder?: () => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

export function ChatItem({
  id,
  title,
  isLocked,
  isPinned,
  onDelete,
  onRename,
  onRemoveFromFolder,
  onTogglePin,
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

  const handleTogglePin = () => {
    if (onTogglePin) {
      onTogglePin(id, !isPinned);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'chat', id }));
    e.dataTransfer.effectAllowed = 'move';

    const dragImage = document.createElement('div');
    dragImage.className = 'px-3 py-2 bg-neutral-800 rounded-lg text-sm text-white shadow-lg max-w-[200px] truncate';
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
      <div className="px-0">
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
          className="w-full h-9 px-3 rounded-xl bg-neutral-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-neutral-600 transition-all"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'relative group transition-all duration-150',
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
            'flex items-center w-full h-9 px-3 rounded-xl text-sm transition-all duration-150 overflow-hidden',
            isActive
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white hover:bg-white/5'
          )}
        >
          {/* Lock indicator */}
          {isLocked && (
            <Lock className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-neutral-500" />
          )}

          {/* Title */}
          <span className="flex-1 truncate text-left min-w-0" dir="auto">
            {title}
          </span>

          {/* Menu trigger - shows on hover or when active */}
          <div
            className={cn(
              'flex-shrink-0 ml-2 flex items-center gap-0.5',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/10 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onTogglePin && (
                  <DropdownMenuItem onClick={handleTogglePin} className="gap-2">
                    {isPinned ? (
                      <>
                        <PinOff className="h-3.5 w-3.5" />
                        Unpin
                      </>
                    ) : (
                      <>
                        <Pin className="h-3.5 w-3.5" />
                        Pin to top
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleStartEdit} className="gap-2">
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </DropdownMenuItem>
                {onRemoveFromFolder && (
                  <DropdownMenuItem onClick={onRemoveFromFolder} className="gap-2">
                    <FolderMinus className="h-3.5 w-3.5" />
                    Remove from folder
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
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
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
