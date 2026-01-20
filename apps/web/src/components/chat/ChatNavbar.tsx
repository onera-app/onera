import { useState, useRef, useEffect, memo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Menu, Plus, Share, MoreHorizontal, Edit, Archive, Trash, MessagesSquare } from 'lucide-react';

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
  onArchive,
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
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 h-16 bg-white/5 backdrop-blur-xl border-b border-white/5 shadow-sm">
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Title Section */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {!sidebarOpen && <MessagesSquare className="h-5 w-5 text-muted-foreground/70 shrink-0" />}

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
                className="h-8 text-sm font-medium border-transparent focus-visible:ring-1 focus-visible:ring-ring px-2 -ml-2 bg-transparent"
              />
            ) : (
              <button
                onClick={() => onTitleChange && setIsEditing(true)}
                className={cn(
                  'text-sm font-medium truncate text-left max-w-full px-2 -ml-2 rounded-md transition-colors',
                  onTitleChange
                    ? 'hover:bg-muted/50 hover:text-foreground cursor-text'
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
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 hidden sm:flex"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/app' })}
          title="New chat"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 sm:hidden"
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* Share button (placeholder) */}
        <Button
          variant="ghost"
          size="icon"
          title="Share (coming soon)"
          disabled
          className="text-muted-foreground/50"
        >
          <Share className="h-4 w-4" />
        </Button>

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="More options"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1">
            {onTitleChange && (
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="rounded-sm">
                <Edit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}

            {onArchive && (
              <DropdownMenuItem onClick={onArchive} className="rounded-sm">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-sm"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Chat
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
              This action cannot be undone. This will permanently delete this conversation and all its messages.
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
});

