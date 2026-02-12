import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderMinus,
  Pin,
  PinOff,
} from "lucide-react";

interface ChatItemProps {
  id: string;
  title: string;
  updatedAt: number;
  isLocked?: boolean;
  isPinned?: boolean;
  isActive?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onRemoveFromFolder?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
}

export const ChatItem = memo(function ChatItem({
  id,
  title,
  isLocked,
  isPinned,
  isActive = false,
  onDelete,
  onRename,
  onRemoveFromFolder,
  onTogglePin,
}: ChatItemProps) {
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
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "chat", id }),
    );
    e.dataTransfer.effectAllowed = "move";

    const dragImage = document.createElement("div");
    dragImage.className =
      "px-3 py-2 bg-card rounded-lg text-sm text-foreground shadow-lg max-w-[200px] truncate";
    dragImage.textContent =
      title.length > 30 ? title.slice(0, 30) + "..." : title;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
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
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") handleCancelEdit();
          }}
          onBlur={handleCancelEdit}
          className="w-full h-9 px-3 rounded-lg bg-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative group transition-colors",
          isDragging && "opacity-40",
        )}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Link
          to="/app/c/$chatId"
          params={{ chatId: id }}
          search={{ pending: false }}
          className={cn(
            "relative flex items-center w-full h-9 px-2.5 rounded-lg text-sm transition-colors overflow-hidden",
            isActive
              ? "bg-white/[0.12] text-white"
              : "text-white/90 hover:text-white hover:bg-white/[0.08]",
          )}
        >
          {/* Lock indicator */}
          {isLocked && (
            <Lock className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-white/50" />
          )}

          {/* Title container */}
          <div className="flex-1 min-w-0 overflow-hidden pr-6">
            <span
              className="block whitespace-nowrap text-left font-normal truncate"
              dir="auto"
            >
              {title}
            </span>
          </div>
        </Link>

        {/* Menu trigger - OpenWebUI style */}
        <div
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-150",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
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
                <DropdownMenuItem
                  onClick={() => onRemoveFromFolder(id)}
                  className="gap-2"
                >
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
      </div>

      {/* Only render AlertDialog when needed to avoid Radix UI overhead */}
      {/* Only render AlertDialog when needed to avoid Radix UI overhead */}
      {showDeleteDialog && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this conversation and all its
                messages.
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
      )}
    </>
  );
});
