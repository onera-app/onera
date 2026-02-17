import { useState, useEffect, useCallback } from 'react';
import { useNote, useUpdateNote } from '@/hooks/queries/useNotes';
import { useFolders } from '@/hooks/queries/useFolders';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import dayjs from 'dayjs';
import {
  decryptNoteTitle,
  decryptNoteContent,
  encryptNoteTitle,
  encryptNoteContent,
} from '@onera/crypto';
import { FileText, Archive, ArchiveRestore, Save } from 'lucide-react';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const { data: note, isLoading } = useNote(noteId);
  const { data: folders = [] } = useFolders();
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // Load note data
  useEffect(() => {
    if (note) {
      setTitle(decryptNoteTitle(note.encryptedTitle, note.titleNonce));
      setContent(decryptNoteContent(note.encryptedContent, note.contentNonce));
      setFolderId(note.folderId);
      setHasChanges(false);
    }
  }, [note]);

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  };

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(true);
  };

  // Handle folder change
  const handleFolderChange = (newFolderId: string) => {
    setFolderId(newFolderId === 'none' ? null : newFolderId);
    setHasChanges(true);
  };

  // Save note
  const handleSave = useCallback(async () => {
    if (!note || !hasChanges) return;

    setIsSaving(true);
    try {
      const encryptedTitle = encryptNoteTitle(title);
      const encryptedContent = encryptNoteContent(content);

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
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [content, folderId, hasChanges, note, title, updateNote]);

  // Toggle archive
  const handleToggleArchive = async () => {
    if (!note) return;

    await updateNote.mutateAsync({
      id: note.id,
      data: {
        archived: !note.archived,
      },
    });
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a note to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 p-3 sm:p-4">
      <div className="flex flex-col h-full bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-850">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {/* Folder selector */}
          <Select
            value={folderId || 'none'}
            onValueChange={handleFolderChange}
          >
            <SelectTrigger className="w-40 bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-850 rounded-xl">
              <SelectValue placeholder="No folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No folder</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Last updated */}
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            Updated {dayjs(note.updatedAt).format('MMM D, YYYY h:mm A')}
          </span>

          {/* Unsaved indicator */}
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleArchive}
          >
            {note.archived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-1" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-gray-850">
        <Input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
        />
      </div>

      {/* Content Editor */}
      <div className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 overflow-y-auto">
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="h-full"
        />
      </div>
      </div>
    </div>
  );
}
