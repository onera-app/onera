import { useState } from 'react';
import { NotesList, NoteEditor } from '@/components/notes';
import { cn } from '@/lib/utils';
import { FileText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMobileBreakpoint } from '@/hooks/useMobileBreakpoint';

export function NotesPage() {
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [showList, setShowList] = useState(true);
  const isMobile = useMobileBreakpoint();

  // On mobile, when a note is selected, hide the list
  const handleSelectNote = (noteId: string) => {
    setSelectedNoteId(noteId);
    // On mobile, switch to editor view when a note is selected
    if (isMobile) {
      setShowList(false);
    }
  };

  const handleBackToList = () => {
    setShowList(true);
    setSelectedNoteId('');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Notes List Sidebar */}
      <div className={cn(
        'border-r border-border flex-shrink-0 transition-all duration-200',
        // Mobile: full width or hidden
        'w-full md:w-80',
        // Hide on mobile when note is selected
        !showList && 'hidden md:block'
      )}>
        <NotesList
          selectedNoteId={selectedNoteId}
          onSelectNote={handleSelectNote}
        />
      </div>

      {/* Note Editor */}
      <div className={cn(
        'flex-1 min-w-0',
        // Hide on mobile when showing list
        showList && !selectedNoteId && 'hidden md:block'
      )}>
        {selectedNoteId ? (
          <div className="h-full flex flex-col">
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="text-muted-foreground"
                aria-label="Back to notes list"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Notes
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <NoteEditor noteId={selectedNoteId} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center text-muted-foreground" role="status" aria-live="polite">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium">Select or create a note</p>
              <p className="text-sm mt-1">Choose a note from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
