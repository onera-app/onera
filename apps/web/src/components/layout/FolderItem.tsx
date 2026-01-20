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
            'relative group rounded-lg transition-all duration-200',
            isDragOver && 'bg-white/10 ring-1 ring-white/20 ring-inset'
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
                className="w-full h-9 px-3 rounded-lg bg-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
            </div>
          ) : (
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-2 w-full py-2 px-2 rounded-lg text-left',
                  'text-neutral-300 hover:text-white hover:bg-white/5 transition-all duration-150'
                )}
              >
                <ChevronRight
                  className={cn(
                    'h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 flex-shrink-0',
                    isExpanded && 'rotate-90'
                  )}
                />
                <span className="flex-1 text-sm truncate">{name}</span>
              </button>
            </CollapsibleTrigger>
          )}

          {/* Menu button */}
          {!isEditing && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 bg-neutral-900 border-neutral-800">
                  <DropdownMenuItem onClick={handleStartEdit} className="gap-2 text-neutral-300 focus:text-white focus:bg-white/10">
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-neutral-800" />
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
          )}
        </div>

        <CollapsibleContent className="animate-accordion-down">
          {children}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete folder?</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-300">
              This will delete "{name}". Conversations inside will be moved to your main list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-white/5 hover:text-white">
              Cancel
            </AlertDialogCancel>
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
