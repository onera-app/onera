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
  Folder,
  FolderOpen,
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
  chatCount,
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
            isDragOver && 'bg-primary/10 ring-2 ring-primary/50 ring-inset'
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
                className="w-full h-9 px-3 rounded-xl bg-sidebar-accent text-sm text-sidebar-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring/50 transition-all"
              />
            </div>
          ) : (
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2 w-full py-2.5 px-3 rounded-xl text-left',
                  'text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-150'
                )}
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground/70 transition-transform duration-200 flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                />
                <div className="relative">
                  {isExpanded ? (
                    <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <span className="flex-1 text-secondary font-medium truncate">{name}</span>
                <span className="text-caption text-muted-foreground/70 tabular-nums px-1.5 py-0.5 rounded-md bg-sidebar-accent/50">
                  {chatCount}
                </span>
              </button>
            </CollapsibleTrigger>
          )}

          {/* Menu button */}
          {!isEditing && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-background/60 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleStartEdit} className="gap-2 text-secondary">
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
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
          )}
        </div>

        <CollapsibleContent className="animate-accordion-down">
          <div className="relative ml-[18px] pl-4 mt-0.5">
            {/* Subtle connecting line */}
            <div className="absolute left-0 top-0 bottom-2 w-px bg-gradient-to-b from-sidebar-border/60 via-sidebar-border/40 to-transparent" />
            <div className="space-y-0.5">
              {children}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription className="text-secondary">
              This will delete "{name}". Conversations inside will be moved to your main list.
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
