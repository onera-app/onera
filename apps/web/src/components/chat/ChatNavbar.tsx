import { useState, memo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Menu, Plus, MoreHorizontal, Trash } from 'lucide-react';

interface ChatNavbarProps {
  chatId: string;
  onDelete?: () => void;
  children?: React.ReactNode;
}

export const ChatNavbar = memo(function ChatNavbar({
  chatId: _chatId,
  onDelete,
  children,
}: ChatNavbarProps) {
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 h-14 bg-background/80 backdrop-blur-xl border-b border-border w-full">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Menu button (shown when sidebar is closed) */}
        {!sidebarOpen && (
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="text-muted-foreground hover:text-foreground h-9 w-9 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Model Selector (passed as children) */}
        {children}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
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
        {onDelete && (
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
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-500 dark:text-red-400 focus:text-red-500 dark:focus:text-red-400 focus:bg-red-500/10"
              >
                <Trash className="h-4 w-4" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
