import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrompts, useDeletePrompt } from '@/hooks/queries/usePrompts';
import { Button } from '@/components/common/Button';
import dayjs from 'dayjs';

interface PromptsListProps {
  selectedPromptId?: string;
  onSelectPrompt: (id: string) => void;
  onCreatePrompt: () => void;
}

export function PromptsList({ selectedPromptId, onSelectPrompt, onCreatePrompt }: PromptsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: prompts = [], isLoading } = usePrompts();
  const deletePrompt = useDeletePrompt();

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeletePrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this prompt?')) {
      await deletePrompt.mutateAsync(id);
      if (selectedPromptId === id) {
        onSelectPrompt('');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prompts</h2>
        <Button size="sm" onClick={onCreatePrompt}>
          New Prompt
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <input
          type="text"
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg',
            'border border-gray-200 dark:border-gray-700',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-white',
            'placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        />
      </div>

      {/* Prompts List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : filteredPrompts.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No prompts match your search' : 'No prompts yet. Create one!'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => onSelectPrompt(prompt.id)}
                className={cn(
                  'p-4 cursor-pointer transition-colors group',
                  selectedPromptId === prompt.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {prompt.name}
                    </h3>
                    {prompt.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {prompt.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {dayjs(prompt.updated_at).format('MMM D, YYYY')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeletePrompt(prompt.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    title="Delete prompt"
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
