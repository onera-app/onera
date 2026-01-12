import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/queries/useNotes';
import { useFolders } from '@/hooks/queries/useFolders';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import { encryptNote, decryptNoteTitle } from '@cortex/crypto';
import { Plus, FileText, Trash2 } from 'lucide-react';

interface NotesListProps {
  selectedNoteId?: string;
  onSelectNote: (id: string) => void;
}

export function NotesList({ selectedNoteId, onSelectNote }: NotesListProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { data: notes = [], isLoading: notesLoading } = useNotes(selectedFolderId, showArchived);
  const { data: folders = [] } = useFolders();
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const handleCreateNote = async () => {
    const noteId = uuid();
    const encryptedData = encryptNote('New Note', '<p></p>');

    await createNote.mutateAsync({
      encryptedTitle: encryptedData.encryptedTitle,
      titleNonce: encryptedData.titleNonce,
      encryptedContent: encryptedData.encryptedContent,
      contentNonce: encryptedData.contentNonce,
      folderId: selectedFolderId,
    });
    onSelectNote(noteId);
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;
    await deleteNote.mutateAsync(deleteNoteId);
    if (selectedNoteId === deleteNoteId) {
      onSelectNote('');
    }
    setDeleteNoteId(null);
  };

  // Decrypt note title
  const getTitle = (note: { encryptedTitle: string; titleNonce: string }) => {
    return decryptNoteTitle(note.encryptedTitle, note.titleNonce);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button size="sm" onClick={handleCreateNote} disabled={createNote.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            {createNote.isPending ? 'Creating...' : 'New Note'}
          </Button>
        </div>

        {/* Folder Filter */}
        <div className="p-3 border-b border-border">
          <Select
            value={selectedFolderId || 'all'}
            onValueChange={(value) => setSelectedFolderId(value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Folders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Archive Toggle */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-archived"
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked === true)}
            />
            <Label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
              Show archived
            </Label>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto">
          {notesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {showArchived ? 'No archived notes' : 'No notes yet. Create one!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={cn(
                    'p-4 cursor-pointer transition-colors group',
                    selectedNoteId === note.id
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {getTitle(note)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dayjs(note.updatedAt).format('MMM D, YYYY h:mm A')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteNoteId(note.id);
                      }}
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
