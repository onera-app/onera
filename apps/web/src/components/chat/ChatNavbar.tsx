import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Menu, Plus, Share, MoreHorizontal, Edit, Archive, Trash } from 'lucide-react';

interface ChatNavbarProps {
  title: string;
  chatId: string;
  onTitleChange?: (newTitle: string) => void;
  onDelete?: () => void;
  onArchive?: () => void;
}

export function ChatNavbar({
  title,
  chatId: _chatId,
  onTitleChange,
  onDelete,
  onArchive,
}: ChatNavbarProps) {
  // chatId reserved for future use (share links, etc.)
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  return (
    <header className="flex items-center gap-2 px-4 py-3 min-h-[56px]">
      {/* Menu button (shown when sidebar is closed) */}
      {!sidebarOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* New chat button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate({ to: '/' })}
        title="New chat"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTitle();
              if (e.key === 'Escape') {
                setEditValue(title);
                setIsEditing(false);
              }
            }}
            onBlur={handleSaveTitle}
            className="text-lg font-semibold border-primary"
          />
        ) : (
          <button
            onClick={() => onTitleChange && setIsEditing(true)}
            className={cn(
              'text-lg font-semibold truncate text-left max-w-full',
              onTitleChange && 'hover:text-muted-foreground cursor-pointer'
            )}
            title={onTitleChange ? 'Click to edit title' : title}
            disabled={!onTitleChange}
          >
            {title}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Share button (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          title="Share (coming soon)"
          disabled
        >
          <Share className="h-5 w-5" />
        </Button>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="More options">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onTitleChange && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}

            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
