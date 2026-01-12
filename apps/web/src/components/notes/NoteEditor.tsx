import { useState, useEffect } from 'react';
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
} from '@cortex/crypto';
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
  const handleSave = async () => {
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
  };

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
      <div className="flex flex-col h-full bg-background p-6">
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
        <div className="text-center text-muted-foreground">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a note to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4 flex-1">
          {/* Folder selector */}
          <Select
            value={folderId || 'none'}
            onValueChange={handleFolderChange}
          >
            <SelectTrigger className="w-40">
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
          <span className="text-xs text-muted-foreground">
            Updated {dayjs(note.updatedAt).format('MMM D, YYYY h:mm A')}
          </span>

          {/* Unsaved indicator */}
          {hasChanges && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Unsaved changes
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
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
      <div className="px-6 py-4">
        <Input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
        />
      </div>

      {/* Content Editor */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <RichTextEditor
          content={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="h-full"
        />
      </div>
    </div>
  );
}
