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
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 h-14 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-neutral-400 hover:text-white hover:bg-white/5 h-8 w-8"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Title Section */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
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
                className="h-8 text-sm font-medium border-transparent bg-white/5 focus-visible:ring-1 focus-visible:ring-white/20 px-2 text-white"
              />
            ) : (
              <button
                onClick={() => onTitleChange && setIsEditing(true)}
                className={cn(
                  'text-sm font-medium truncate text-left max-w-full px-2 py-1 -ml-2 rounded-md transition-colors text-white',
                  onTitleChange
                    ? 'hover:bg-white/5 cursor-text'
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
          className="text-neutral-400 hover:text-white hover:bg-white/5 hidden sm:flex h-8"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/app' })}
          title="New chat"
          className="text-neutral-400 hover:text-white hover:bg-white/5 sm:hidden h-8 w-8"
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
              className="text-neutral-400 hover:text-white hover:bg-white/5 h-8 w-8"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-neutral-900 border-neutral-800">
            {onTitleChange && (
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2 text-neutral-300 focus:text-white focus:bg-white/10">
                <Edit className="h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator className="bg-neutral-800" />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
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
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              This action cannot be undone. This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-white/5 hover:text-white">
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
