import { useState, useEffect } from 'react';
import { NotesList, NoteEditor } from '@/components/notes';
import { cn } from '@/lib/utils';
import { useMobileBreakpoint } from '@/hooks/useMobileBreakpoint';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';

export function NotesPage() {
  const search = useSearch({ from: '/app/notes' });
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [showList, setShowList] = useState(true);
  const isMobile = useMobileBreakpoint();
  const navigate = useNavigate({ from: '/app/notes' });

  // Sync selectedNoteId with search param
  useEffect(() => {
    if (search.noteId) {
      setSelectedNoteId(search.noteId);
      if (isMobile) {
        setShowList(false);
      }
    } else {
      setSelectedNoteId('');
      if (isMobile) {
        setShowList(true);
      }
    }
  }, [search.noteId, isMobile]);

  // On mobile, when a note is selected, hide the list
  const handleSelectNote = (noteId: string) => {
    navigate({
      search: (prev) => ({ ...prev, noteId }),
    });
  };

  const handleBackToList = () => {
    navigate({
      search: (prev) => {
        const { noteId: _, ...rest } = prev;
        return rest;
      },
    });
  };

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-900 relative">
      {/* Background decoration for premium feel */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50 dark:opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <AnimatePresence mode={isMobile ? "wait" : "sync"}>
        {/* Notes List Sidebar */}
        {(showList || !isMobile) && (
          <motion.div
            key="sidebar"
            initial={isMobile ? { x: -20, opacity: 0 } : undefined}
            animate={{ x: 0, opacity: 1 }}
            exit={isMobile ? { x: -20, opacity: 0 } : undefined}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              'border-r border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-xl flex-shrink-0 z-20',
              'w-full md:w-88',
              isMobile && !showList && 'hidden'
            )}
          >
            <NotesList
              selectedNoteId={selectedNoteId}
              onSelectNote={handleSelectNote}
            />
          </motion.div>
        )}

        {/* Note Editor */}
        {(!showList || !isMobile) && (
          <motion.div
            key="editor"
            initial={isMobile ? { x: "100%", opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ x: 0, opacity: 1, y: 0 }}
            exit={isMobile ? { x: "100%", opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              'flex-1 min-w-0 z-10',
              isMobile && showList && 'hidden'
            )}
          >
            {selectedNoteId ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <NoteEditor
                    key={selectedNoteId}
                    noteId={selectedNoteId}
                    onBack={isMobile ? handleBackToList : undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center animate-enter">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-850 flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-850 shadow-sm">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    <div className="w-10 h-10 text-gray-400 dark:text-gray-500">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                    </div>
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Capture your thoughts</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                  Select a note from the left to start editing, or create a new one to begin your journey.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
