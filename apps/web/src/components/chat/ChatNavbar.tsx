import { useState, useRef, useEffect, memo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Menu, Plus, MoreHorizontal, Edit, Trash } from 'lucide-react';

interface ChatNavbarProps {
  title: string;
  chatId: string;
  onTitleChange?: (newTitle: string) => void;
  onDelete?: () => void;
  onArchive?: () => void;
  children?: React.ReactNode;
}

export const ChatNavbar = memo(function ChatNavbar({
  title,
  chatId: _chatId,
  onTitleChange,
  onDelete,
  children,
}: ChatNavbarProps) {
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
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 h-14 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Title Section */}
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
              className="h-8 text-sm font-medium border-transparent bg-accent focus-visible:ring-1 focus-visible:ring-ring px-2 text-foreground max-w-md"
            />
          ) : (
            <button
              onClick={() => onTitleChange && setIsEditing(true)}
              className={cn(
                'text-sm font-medium truncate text-left block w-full max-w-lg px-2 py-1 -ml-2 rounded-md transition-colors text-foreground',
                onTitleChange
                  ? 'hover:bg-accent cursor-text'
                  : 'cursor-default'
              )}
              title={onTitleChange ? 'Click to edit title' : title}
              disabled={!onTitleChange}
            >
              {title}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {children}

        {/* New chat button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/app' })}
          title="New chat"
          className="text-muted-foreground hover:text-foreground hover:bg-accent hidden sm:flex h-8"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/app' })}
          title="New chat"
          className="text-muted-foreground hover:text-foreground hover:bg-accent sm:hidden h-8 w-8"
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="More options"
              className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            {onTitleChange && (
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2 text-muted-foreground focus:text-foreground focus:bg-accent">
                <Edit className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-red-500 dark:text-red-400 focus:text-red-500 dark:focus:text-red-400 focus:bg-red-500/10"
                >
                  <Trash className="h-4 w-4" />
                  Delete Chat
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-accent hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
});
