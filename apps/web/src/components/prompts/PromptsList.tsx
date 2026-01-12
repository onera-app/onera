import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrompts, useDeletePrompt } from '@/hooks/queries/usePrompts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Search, MessageSquareText, Trash2 } from 'lucide-react';

interface PromptsListProps {
  selectedPromptId?: string;
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => void;
}

export function PromptsList({ selectedPromptId, onSelectPrompt, onCreatePrompt }: PromptsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const { data: prompts = [], isLoading } = usePrompts();
  const deletePrompt = useDeletePrompt();

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeletePrompt = async () => {
    if (!deletePromptId) return;
    await deletePrompt.mutateAsync(deletePromptId);
    if (selectedPromptId === deletePromptId) {
      onSelectPrompt('');
    }
    setDeletePromptId(null);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-muted/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Prompts</h2>
          <Button size="sm" onClick={onCreatePrompt}>
            <Plus className="h-4 w-4 mr-1" />
            New Prompt
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Prompts List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquareText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No prompts match your search' : 'No prompts yet. Create one!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => onSelectPrompt(prompt.id)}
                  className={cn(
                    'p-4 cursor-pointer transition-colors group',
                    selectedPromptId === prompt.id
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">
                        {prompt.name}
                      </h3>
                      {prompt.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {prompt.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {dayjs(prompt.updated_at).format('MMM D, YYYY')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePromptId(prompt.id);
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
      <AlertDialog open={!!deletePromptId} onOpenChange={() => setDeletePromptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrompt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
