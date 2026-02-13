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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

interface FolderItemProps {
  id: string;
  name: string;
  chatCount: number;
  isExpanded: boolean;
  isNew?: boolean;
  onToggle: () => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onDrop?: (folderId: string, chatId: string) => void;
  children: React.ReactNode;
}

export function FolderItem({
  id,
  name,
  isExpanded,
  isNew,
  onToggle,
  onRename,
  onDelete,
  onDrop,
  children,
}: FolderItemProps) {
  const [isEditing, setIsEditing] = useState(isNew || false);
  const [editName, setEditName] = useState(name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditName(name);
  };

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== name) {
      onRename(id, trimmedName);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(name);
    if (isNew) {
      onDelete(id);
    }
  };

  const handleDelete = () => {
    onDelete(id);
    setShowDeleteDialog(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'chat' && data.id && onDrop) {
        onDrop(id, data.id);
      }
    } catch {
      // Invalid drop data
    }
  };

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div
          className={cn(
            'relative group rounded-xl transition-all duration-200',
            isDragOver && 'bg-sidebar-accent ring-1 ring-ring ring-inset'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isEditing ? (
            <div className="px-1 py-0.5">
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                onBlur={handleSaveEdit}
                placeholder="Folder name"
                className="w-full h-9 px-3 rounded-lg bg-sidebar-accent text-sm text-sidebar-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring transition-all"
              />
            </div>
          ) : (
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                'flex items-center gap-2 w-full py-2 px-2.5 rounded-xl text-left',
                  'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
                )}
              >
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-sidebar-foreground/65 transition-transform duration-200 flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                />
                <span className="flex-1 text-sm truncate">{name}</span>
              </button>
            </CollapsibleTrigger>
          )}

          {/* Menu button */}
          {!isEditing && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-150">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-xl text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 bg-popover border-border">
                  <DropdownMenuItem onClick={handleStartEdit} className="gap-2 text-muted-foreground focus:text-foreground focus:bg-accent">
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <CollapsibleContent className="animate-accordion-down">
          {children}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete folder?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will delete "{name}". Conversations inside will be moved to your main list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-muted-foreground hover:bg-accent hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
