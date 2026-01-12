import { useState } from 'react';
import { NotesList, NoteEditor } from '@/components/notes';
import { FileText } from 'lucide-react';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  return (
    <div className="flex h-full">
      {/* Notes List Sidebar */}
      <div className="w-80 border-r border-border flex-shrink-0">
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
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select or create a note</p>
              <p className="text-sm mt-1">Choose a note from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
