import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, FolderMinusIcon, Loading02Icon, LockIcon, MoreHorizontalIcon, PencilIcon, PinIcon, PinOffIcon } from "@hugeicons/core-free-icons";
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

interface ChatItemProps {
  id: string;
  title: string;
  updatedAt: number;
  isLocked?: boolean;
  isPinned?: boolean;
  isTitleGenerating?: boolean;
  isActive?: boolean;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onRemoveFromFolder?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onClick?: () => void;
}

export const ChatItem = memo(function ChatItem({
  id,
  title,
  updatedAt,
  isLocked,
  isPinned,
  isTitleGenerating = false,
  isActive = false,
  onDelete,
  onRename,
  onRemoveFromFolder,
  onTogglePin,
  onClick,
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
      "bg-black/80 backdrop-blur-2xl px-2 py-1 rounded-lg w-fit max-w-40 text-xs text-white";
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

  const getTimeLabel = (timestamp: number) => {
    const now = Date.now();
    const deltaMs = Math.max(0, now - timestamp);
    const minutes = Math.floor(deltaMs / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
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
          className="w-full h-8 px-3 rounded-xl bg-gray-100 dark:bg-gray-850 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
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
          onClick={onClick}
          className={cn(
            "relative flex items-center w-full px-2.5 py-1.5 rounded-xl text-sm transition-colors overflow-hidden",
            isActive
              ? "bg-gray-100 dark:bg-gray-900/80 text-gray-900 dark:text-gray-100"
              : "text-gray-700 dark:text-gray-100 hover:text-gray-900 dark:hover:text-gray-100 group-hover:bg-gray-100 dark:group-hover:bg-gray-950",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {/* Lock indicator */}
          {isLocked && (
            <HugeiconsIcon icon={LockIcon} className="w-3.5 h-3.5 mr-2 flex-shrink-0 text-gray-400 dark:text-gray-600" />
          )}

          {/* Title container */}
          <div className="flex-1 min-w-0 overflow-hidden pr-14 md:pr-9">
            <div className="flex items-center gap-1.5 min-w-0 h-5">
              {isTitleGenerating && (
                <HugeiconsIcon icon={Loading02Icon} className="h-3.5 w-3.5 animate-spin text-gray-500 dark:text-gray-400 flex-shrink-0" />
              )}
              <span
                className="block whitespace-nowrap text-left text-[0.9rem] font-normal overflow-hidden h-5 leading-5 truncate"
                dir="auto"
              >
                {isTitleGenerating ? "New Chat" : title}
              </span>
            </div>
          </div>

          {!isActive && (
            <span className="absolute right-9 md:right-2.5 top-1/2 -translate-y-1/2 text-[0.75rem] text-gray-500 dark:text-gray-400 tabular-nums transition-opacity duration-150 opacity-100 md:group-hover:opacity-0 md:group-focus-within:opacity-0">
              {getTimeLabel(updatedAt)}
            </span>
          )}
        </Link>

        {/* Menu trigger — Open WebUI style */}
        <div
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex items-center",
            isActive
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
            "transition-opacity duration-150",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-lg text-gray-400 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none"
                onClick={(e) => e.preventDefault()}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onTogglePin && (
                <DropdownMenuItem onClick={handleTogglePin} className="gap-2">
                  {isPinned ? (
                    <>
                      <HugeiconsIcon icon={PinOffIcon} className="h-3.5 w-3.5" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={PinIcon} className="h-3.5 w-3.5" />
                      Pin to top
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleStartEdit} className="gap-2">
                <HugeiconsIcon icon={PencilIcon} className="h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              {onRemoveFromFolder && (
                <DropdownMenuItem
                  onClick={() => onRemoveFromFolder(id)}
                  className="gap-2"
                >
                  <HugeiconsIcon icon={FolderMinusIcon} className="h-3.5 w-3.5" />
                  Remove from folder
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
                className="bg-destructive text-white hover:bg-destructive/90"
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
