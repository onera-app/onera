import { useState, useEffect } from 'react';
import { useNote, useUpdateNote } from '@/hooks/queries/useNotes';
import { useFolders } from '@/hooks/queries/useFolders';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  decryptNoteTitle,
  decryptNoteContent,
  encryptNoteTitle,
  encryptNoteContent,
} from '@cortex/crypto';

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
      setTitle(decryptNoteTitle(note.encrypted_title, note.title_nonce));
      setContent(decryptNoteContent(note.encrypted_content, note.content_nonce));
      setFolderId(note.folder_id);
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
    setFolderId(newFolderId || null);
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
          encrypted_title: encryptedTitle.encrypted_title,
          title_nonce: encryptedTitle.title_nonce,
          encrypted_content: encryptedContent.encrypted_content,
          content_nonce: encryptedContent.content_nonce,
          folder_id: folderId || undefined,
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
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Select a note to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 flex-1">
          {/* Folder selector */}
          <select
            value={folderId || ''}
            onChange={(e) => handleFolderChange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          {/* Last updated */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated {dayjs(note.updated_at).format('MMM D, YYYY h:mm A')}
          </span>

          {/* Unsaved indicator */}
          {hasChanges && (
            <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleArchive}
          >
            {note.archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="px-6 py-4">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className={cn(
            'w-full text-2xl font-bold bg-transparent border-none outline-none',
            'text-gray-900 dark:text-white placeholder-gray-400'
          )}
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
