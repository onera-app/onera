import { useState } from 'react';
import { NotesList, NoteEditor } from '@/components/notes';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  return (
    <div className="flex h-full">
      {/* Notes List Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        <NotesList
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
        />
      </div>

      {/* Note Editor */}
      <div className="flex-1">
        {selectedNoteId ? (
          <NoteEditor noteId={selectedNoteId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">Select or create a note</p>
              <p className="text-sm mt-1">Choose a note from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
