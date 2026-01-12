import { Link, useParams } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { cn, truncate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { MessageSquare, Lock, MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ChatItemProps {
  id: string;
  title: string;
  updatedAt: number;
  isLocked?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

export function ChatItem({
  id,
  title,
  updatedAt: _updatedAt,
  isLocked,
  onDelete,
  onRename,
}: ChatItemProps) {
  void _updatedAt;
  const params = useParams({ strict: false });
  const currentChatId = (params as { chatId?: string }).chatId;
  const isActive = currentChatId === id;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
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

  if (isEditing) {
    return (
      <div className="px-2 py-1">
        <Input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveEdit();
            if (e.key === 'Escape') handleCancelEdit();
          }}
          onBlur={handleCancelEdit}
          className="h-9 bg-sidebar-accent border-ring text-sidebar-foreground"
        />
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <Link
          to="/c/$chatId"
          params={{ chatId: id }}
          className={cn(
            'flex items-center gap-2 px-3 py-2 mx-2 rounded-md text-sm transition-colors',
            isActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}
        >
          {/* Chat icon or lock icon */}
          {isLocked ? (
            <Lock className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          ) : (
            <MessageSquare className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          )}

          {/* Title */}
          <span className="flex-1 truncate">{truncate(title, 32)}</span>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-sidebar-foreground"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={handleStartEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Link>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              chat and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
