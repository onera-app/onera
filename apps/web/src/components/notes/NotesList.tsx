import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/queries/useNotes';
import { useFolders } from '@/hooks/queries/useFolders';
import { Button } from '@/components/common/Button';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import { encryptNote, decryptNoteTitle } from '@cortex/crypto';

interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
}

export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [showArchived, setShowArchived] = useState(false);

  const { data: notes = [], isLoading: notesLoading } = useNotes(selectedFolderId, showArchived);
  const { data: folders = [] } = useFolders();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const handleCreateNote = async () => {
    const noteId = uuid();
    const encryptedData = encryptNote('New Note', '<p></p>');

    await createNote.mutateAsync({
      id: noteId,
      encrypted_title: encryptedData.encrypted_title,
      title_nonce: encryptedData.title_nonce,
      encrypted_content: encryptedData.encrypted_content,
      content_nonce: encryptedData.content_nonce,
      folder_id: selectedFolderId,
    });
    onSelectNote(noteId);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this note?')) {
      await deleteNote.mutateAsync(id);
      if (selectedNoteId === id) {
        onSelectNote('');
      }
    }
  };

  // Decrypt note title
  const getTitle = (note: { encrypted_title: string; title_nonce: string }) => {
    return decryptNoteTitle(note.encrypted_title, note.title_nonce);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notes</h2>
        <Button size="sm" onClick={handleCreateNote} disabled={createNote.isPending}>
          {createNote.isPending ? 'Creating...' : 'New Note'}
        </Button>
      </div>

      {/* Folder Filter */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800">
        <select
          value={selectedFolderId || ''}
          onChange={(e) => setSelectedFolderId(e.target.value || undefined)}
          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">All Folders</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      {/* Archive Toggle */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Show archived
        </label>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {notesLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {showArchived ? 'No archived notes' : 'No notes yet. Create one!'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={cn(
                  'p-4 cursor-pointer transition-colors group',
                  selectedNoteId === note.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {getTitle(note)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {dayjs(note.updated_at).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete note"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
