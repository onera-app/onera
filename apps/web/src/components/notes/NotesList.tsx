import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  ArchiveArrowUpIcon,
  ArchiveIcon,
  Delete02Icon,
  FileAttachmentIcon,
  Loading02Icon,
  Menu01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import {
  useNotes,
  useCreateNote,
  useDeleteNote,
} from "@/hooks/queries/useNotes";
import { useFolders } from "@/hooks/queries/useFolders";
import { useE2EE } from "@/providers/E2EEProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { createEncryptedNote, decryptNoteTitle } from "@onera/crypto";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useNoteSearch } from "@/hooks/useNoteSearch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
}

export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<
    string | undefined
  >();
  const [showArchived, setShowArchived] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toggleSidebar } = useUIStore();
  const { isUnlocked } = useE2EE();

  const { data: notes = [], isLoading: notesLoading } = useNotes(
    selectedFolderId,
    showArchived,
  );
  const { data: folders = [] } = useFolders();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const {
    search: performSearch,
    results: searchResults,
    isSearching,
  } = useNoteSearch();

  const handleCreateNote = async () => {
    try {
      const noteId = uuid();
      const encryptedData = createEncryptedNote(noteId, "New Note", "<p></p>");

      await createNote.mutateAsync({
        noteId,
        encryptedNoteKey: encryptedData.encryptedNoteKey,
        noteKeyNonce: encryptedData.noteKeyNonce,
        encryptedTitle: encryptedData.encryptedTitle,
        titleNonce: encryptedData.titleNonce,
        encryptedContent: encryptedData.encryptedContent,
        contentNonce: encryptedData.contentNonce,
        folderId: selectedFolderId,
      });
      onSelectNote(noteId);
    } catch (error) {
      console.error("[NotesList] Failed to create note:", error);
      toast.error("Failed to create note");
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    await deleteNote.mutateAsync(deleteNoteId);
    if (selectedNoteId === deleteNoteId) {
      onSelectNote("");
    }
    setDeleteNoteId(null);
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Sync selectedFolderId with existing folders
  useEffect(() => {
    if (selectedFolderId && folders.length > 0) {
      const folderExists = folders.some((f) => f.id === selectedFolderId);
      if (!folderExists) {
        setSelectedFolderId(undefined);
      }
    }
  }, [folders, selectedFolderId]);

  const displayNotes = searchQuery.trim() ? searchResults : notes;

  return (
    <>
      <div className="flex flex-col h-full bg-transparent">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md px-4 pt-5 pb-3 space-y-4 border-b border-gray-100 dark:border-gray-850">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-9 w-9 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl md:hidden"
            >
              <HugeiconsIcon icon={Menu01Icon} className="h-[18px] w-[18px]" />
            </Button>
            <h2 className="text-xl font-bold font-primary tracking-tight text-gray-900 dark:text-gray-100">
              Notes
            </h2>
            <div className="flex-1" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleCreateNote}
                    disabled={createNote.isPending}
                    className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-xl transition-all active:scale-95 disabled:opacity-70"
                  >
                    <HugeiconsIcon icon={Add01Icon} className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Note</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-3">
            {/* Search */}
            <div className="relative group">
              <HugeiconsIcon
                icon={Search01Icon}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors"
              />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <HugeiconsIcon
                    icon={Loading02Icon}
                    className="h-4 w-4 animate-spin text-gray-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={selectedFolderId || "all"}
                  onValueChange={(value) =>
                    setSelectedFolderId(value === "all" ? undefined : value)
                  }
                  options={[
                    { value: "all", label: "All Folders" },
                    ...folders.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                  placeholder="All Folders"
                  triggerClassName="h-9 w-full bg-white dark:bg-gray-850/50 border-gray-100 dark:border-gray-850 rounded-xl text-xs"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  "h-9 w-9 rounded-xl transition-colors",
                  showArchived
                    ? "bg-primary/10 text-primary"
                    : "text-gray-500 dark:text-gray-400",
                )}
              >
                {showArchived ? (
                  <HugeiconsIcon
                    icon={ArchiveArrowUpIcon}
                    className="h-4 w-4"
                  />
                ) : (
                  <HugeiconsIcon icon={ArchiveIcon} className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 chat-scrollbar">
          {notesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-transparent space-y-3"
                >
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg opacity-60" />
                </div>
              ))}
            </div>
          ) : displayNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-850">
                <HugeiconsIcon
                  icon={FileAttachmentIcon}
                  className="h-8 w-8 text-gray-300 dark:text-gray-600"
                />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {searchQuery
                  ? "No notes match your search"
                  : showArchived
                    ? "No archived notes"
                    : "No notes yet"}
              </p>
              {!searchQuery && !showArchived && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCreateNote}
                  className="mt-2 text-primary"
                  disabled={createNote.isPending}
                >
                  {createNote.isPending ? (
                    <>
                      <HugeiconsIcon
                        icon={Loading02Icon}
                        className="mr-2 h-4 w-4 animate-spin"
                      />
                      Creating...
                    </>
                  ) : (
                    "Create your first note"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pb-20">
              <AnimatePresence mode="popLayout" initial={false}>
                {displayNotes.map((noteOrResult) => {
                  const isSearchResult =
                    "title" in noteOrResult &&
                    !("encryptedTitle" in noteOrResult);
                  const noteId = noteOrResult.id;
                  const isSelected = selectedNoteId === noteId;

                  let title = "";
                  let contentSnippet = "";
                  let updatedAt = 0;
                  let archived = false;

                  if (isSearchResult) {
                    const result = noteOrResult as any;
                    title = result.title;
                    contentSnippet = result.content;
                    updatedAt = result.createdAt;
                  } else {
                    const note = noteOrResult as any;
                    title = isUnlocked
                      ? decryptNoteTitle(
                          note.id,
                          note.encryptedTitle,
                          note.titleNonce,
                          note.encryptedNoteKey ?? undefined,
                          note.noteKeyNonce ?? undefined,
                        ) || "Untitled Note"
                      : "Encrypted";
                    updatedAt = note.updatedAt;
                    archived = note.archived;
                  }

                  return (
                    <motion.div
                      key={noteId}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 300,
                      }}
                      onClick={() => onSelectNote(noteId)}
                      className={cn(
                        "group relative p-4 sm:p-5 rounded-2xl cursor-pointer transition-all duration-200 border",
                        isSelected
                          ? "bg-white dark:bg-gray-850 border-gray-200/50 dark:border-gray-800 shadow-sm ring-1 ring-primary/5"
                          : "bg-transparent border-transparent hover:bg-gray-100/50 dark:hover:bg-gray-850/50 hover:border-gray-100 dark:hover:border-gray-850",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3
                            className={cn(
                              "font-semibold truncate text-[15px] sm:text-base transition-colors",
                              isSelected
                                ? "text-primary"
                                : "text-gray-900 dark:text-gray-100",
                            )}
                          >
                            {title}
                          </h3>
                          {contentSnippet && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {contentSnippet}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 sm:mt-2.5">
                            <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-tight">
                              {dayjs(updatedAt).format("MMM D")}
                            </span>
                            {archived && (
                              <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteNoteId(noteId);
                            }}
                            className={cn(
                              "h-8 w-8 text-gray-400 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all",
                              "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                            )}
                          >
                            <HugeiconsIcon
                              icon={Delete02Icon}
                              className="h-4 w-4"
                            />
                          </Button>
                        </div>
                      </div>
                      {isSelected && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 top-3 bottom-3 sm:top-4 sm:bottom-4 w-1 bg-primary rounded-full transition-all"
                          transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 300,
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteNoteId}
        onOpenChange={() => setDeleteNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
