import { useState, useEffect, useCallback, useRef } from 'react';
import { useNote, useUpdateNote } from '@/hooks/queries/useNotes';
import { useFolders } from '@/hooks/queries/useFolders';
import { useE2EE } from '@/providers/E2EEProvider';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import {
  decryptNoteTitle,
  decryptNoteContent,
  encryptNoteTitle,
  encryptNoteContent,
  createEncryptedNote,
  type EncryptedNoteData,
} from '@onera/crypto';
import {
  FileText,
  Archive,
  ArchiveRestore,
  Save,
  Clock,
  Folder,
  Trash2,
  ChevronLeft,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeleteNote } from '@/hooks/queries/useNotes';
import { toast } from 'sonner';

interface NoteEditorProps {
  noteId: string;
  onBack?: () => void;
}

export function NoteEditor({ noteId, onBack }: NoteEditorProps) {
  const { data: note, isLoading } = useNote(noteId);
  const { data: folders = [] } = useFolders();
  const { isUnlocked } = useE2EE();
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialLoad = useRef(true);
  const prevNoteId = useRef<string | null>(null);
  const prevIsUnlocked = useRef(isUnlocked);
  const latestState = useRef({ title: '', content: '', folderId: null as string | null });
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Keep latestState in sync
  useEffect(() => {
    latestState.current = { title, content, folderId };
  }, [title, content, folderId]);
  const deleteNote = useDeleteNote();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);


  // Load note data
  useEffect(() => {
    if (!note || !isUnlocked) {
      prevIsUnlocked.current = isUnlocked;
      return;
    }

    const isNewNote = prevNoteId.current !== note.id;
    const wasJustUnlocked = isUnlocked && !prevIsUnlocked.current;

    if (isNewNote || wasJustUnlocked || !hasChanges) {
      try {
        const decryptedTitle = decryptNoteTitle(
          note.id,
          note.encryptedTitle,
          note.titleNonce,
          note.encryptedNoteKey ?? undefined,
          note.noteKeyNonce ?? undefined,
        );
        const decryptedContent = decryptNoteContent(
          note.id,
          note.encryptedContent,
          note.contentNonce,
          note.encryptedNoteKey ?? undefined,
          note.noteKeyNonce ?? undefined,
        );

        console.log('[NoteEditor] Decrypted content successfully');
        setTitle(decryptedTitle);
        setContent(decryptedContent);
        setFolderId(note.folderId);

        if (isNewNote || wasJustUnlocked) {
          setHasChanges(false);
          isInitialLoad.current = true;
          prevNoteId.current = note.id;
          prevIsUnlocked.current = isUnlocked;
        }

        // Reset the flag after a short delay to allow all children (editor) to finish their initial renders
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 100);
      } catch (error) {
        console.error('[NoteEditor] Error in decryption:', error);
        toast.error('Failed to decrypt note content');
      }
    } else {
      console.log('[NoteEditor] Background update skipped to preserve unsaved changes');
    }
  }, [note, hasChanges, isUnlocked]);

  // Handle auto-resizing title textarea
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [title]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    if (note?.archived) return;
    setTitle(newTitle);
    if (!isInitialLoad.current) {
      setHasChanges(true);
    }
  };

  // Handle content change
  const handleContentChange = (newContent: string) => {
    if (note?.archived) return;
    setContent(newContent);
    if (!isInitialLoad.current) {
      setHasChanges(true);
    }
  };

  // Handle folder change
  const handleFolderChange = (newFolderId: string) => {
    if (note?.archived) return;
    setFolderId(newFolderId === 'none' ? null : newFolderId);
    setHasChanges(true);
  };

  // Save note
  const handleSave = useCallback(async () => {
    if (!note || !hasChanges || isSaving) return;

    const savedTitle = title;
    const savedContent = content;
    const savedFolderId = folderId;

    setIsSaving(true);
    try {
      const encryptedNoteKey = note.encryptedNoteKey ?? undefined;
      const noteKeyNonce = note.noteKeyNonce ?? undefined;
      let newIsolatedKeyData: EncryptedNoteData | null = null;

      // Migration: If this is a legacy note (no isolated key), generate one now
      if (!encryptedNoteKey || !noteKeyNonce) {
        console.log('Migrating legacy note to isolated key...');
        const newEncryptedNote = createEncryptedNote(note.id, title, content);
        newIsolatedKeyData = {
          encryptedNoteKey: newEncryptedNote.encryptedNoteKey,
          noteKeyNonce: newEncryptedNote.noteKeyNonce,
          encryptedTitle: newEncryptedNote.encryptedTitle,
          titleNonce: newEncryptedNote.titleNonce,
          encryptedContent: newEncryptedNote.encryptedContent,
          contentNonce: newEncryptedNote.contentNonce,
        };
      }

      if (newIsolatedKeyData) {
        await updateNote.mutateAsync({
          id: note.id,
          data: {
            ...newIsolatedKeyData,
            folderId: folderId || undefined,
          },
        });
      } else {
        const encryptedTitle = encryptNoteTitle(
          note.id,
          title,
          encryptedNoteKey,
          noteKeyNonce,
        );
        const encryptedContent = encryptNoteContent(
          note.id,
          content,
          encryptedNoteKey,
          noteKeyNonce,
        );

        await updateNote.mutateAsync({
          id: note.id,
          data: {
            encryptedTitle: encryptedTitle.encryptedTitle,
            titleNonce: encryptedTitle.titleNonce,
            encryptedContent: encryptedContent.encryptedContent,
            contentNonce: encryptedContent.contentNonce,
            folderId: folderId || undefined,
          },
        });
      }
      // Only reset hasChanges if no new modifications were made since we started saving
      const current = latestState.current;
      if (current.title === savedTitle && current.content === savedContent && current.folderId === savedFolderId) {
        setHasChanges(false);
      }
      toast.success('Note saved');
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  }, [content, folderId, hasChanges, note, title, updateNote]);

  const toggleArchive = async () => {
    if (!note) return;
    try {
      await updateNote.mutateAsync({
        id: note.id,
        data: { archived: !note.archived },
      });
      toast.success(note.archived ? 'Note restored' : 'Note archived');
      setShowArchiveDialog(false);
    } catch (error) {
      toast.error('Failed to update note status');
    }
  };

  const handleToggleArchiveClick = () => {
    if (!note) return;
    if (note.archived) {
      // Restore without confirmation
      toggleArchive();
    } else {
      // Archive with confirmation
      setShowArchiveDialog(true);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await deleteNote.mutateAsync(note.id);
      toast.success('Note deleted');
      setShowDeleteDialog(false);
      if (onBack) onBack();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  // Auto-save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (isLoading || !note) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-none">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-850">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-12 w-3/4 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-full rounded-full" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-white dark:bg-gray-900 border-none relative"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Native-style Premium Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-gray-100 dark:border-gray-850 gap-2 sm:gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-1 sm:gap-4 flex-1 min-w-0">
            {/* Back button (Mobile only) */}
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-9 w-9 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-xl sm:hidden"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Folder Select - Desktop Only */}
            <div className={cn(
              "hidden sm:flex items-center gap-2 px-2 py-1 bg-gray-50/50 dark:bg-gray-850/50 rounded-xl border border-gray-100 dark:border-gray-800 transition-all hover:bg-gray-100 dark:hover:bg-gray-800",
              note.archived && "opacity-50 pointer-events-none"
            )}>
              <Folder className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 ml-1" />
              <SearchableSelect
                value={folderId || 'none'}
                onValueChange={handleFolderChange}
                disabled={note.archived}
                options={[
                  { value: 'none', label: 'No folder' },
                  ...folders.map(f => ({ value: f.id, label: f.name }))
                ]}
                placeholder="Move to folder"
                triggerClassName="border-none bg-transparent hover:bg-transparent px-0 h-7"
              />
            </div>

            {/* Archived Badge */}
            <AnimatePresence>
              {note.archived && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                >
                  <Badge variant="secondary" className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-900/50 px-2 py-0.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Archive className="h-3 w-3" />
                    Archived
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unsaved indicator - Pulsing dot style */}
            <AnimatePresence>
              {hasChanges && !note.archived && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 px-2 py-1 sm:px-2.5 sm:py-1 bg-status-warning/10 text-status-warning-text rounded-full"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-warning opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-status-warning"></span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider inline">Unsaved</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Save Button */}
            {!note.archived && (
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                variant={hasChanges ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 sm:h-9 px-3 sm:px-4 rounded-xl font-semibold transition-all duration-200",
                  !hasChanges && "text-gray-400 dark:text-gray-500 opacity-60"
                )}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    <span className="text-sm px-1">Save</span>
                  </div>
                )}
              </Button>
            )}

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-850"
                >
                  <MoreHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl border-gray-100 dark:border-gray-850 z-50">
                {/* Folder Select - Mobile Only */}
                <div className="sm:hidden px-2 py-2">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">Move to Folder</p>
                  <SearchableSelect
                    value={folderId || 'none'}
                    onValueChange={handleFolderChange}
                    options={[
                      { value: 'none', label: 'No folder' },
                      ...folders.map(f => ({ value: f.id, label: f.name }))
                    ]}
                    placeholder="Select folder"
                    triggerClassName="w-full bg-gray-50 dark:bg-gray-850 border-gray-100 dark:border-gray-800 rounded-xl h-10 px-3"
                  />
                  <DropdownMenuSeparator className="my-2" />
                </div>

                <DropdownMenuItem
                  onClick={handleToggleArchiveClick}
                  className={cn(
                    "rounded-xl flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
                    note.archived ? "text-primary hover:bg-primary/5" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-850"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {note.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    <span className="font-medium">{note.archived ? 'Restore Note' : 'Archive Note'}</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="rounded-xl flex items-center justify-between px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    <span className="font-medium">Delete Permanently</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <div className="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Edited {dayjs(note.updatedAt).fromNow()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{content.replace(/<[^>]*>/g, '').length} characters</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white dark:bg-gray-900 scroll-smooth">
          <div className="w-full ml-0 px-4 sm:px-12 py-2 sm:py-4">
            <div className="mb-1 sm:mb-2 group">
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note title..."
                rows={1}
                readOnly={note.archived}
                className={cn(
                  "w-full resize-none border-none bg-transparent p-0 focus:outline-none focus:ring-0 shadow-none",
                  "text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight",
                  "text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-800/50",
                  "transition-all duration-300",
                  note.archived && "cursor-default select-none"
                )}
              />
            </div>

            {/* Content Area */}
            <div className="relative">
              <RichTextEditor
                content={content}
                onChange={handleContentChange}
                placeholder="Tell your story..."
                className="min-h-[60vh]"
                editable={!note.archived}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your note
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this note?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived notes are moved out of your main list but can be restored
              at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={toggleArchive}>
              Archive Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
