import { useState } from 'react';
import { PromptsList, PromptEditor } from '@/components/prompts';

export function PromptsPage() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePrompt = () => {
    setSelectedPromptId('');
    setIsCreating(true);
  };

  const handleSaved = (id: string) => {
    setSelectedPromptId(id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
  };

  return (
    <div className="flex h-full">
      {/* Prompts List Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex-shrink-0">
        <PromptsList
          selectedPromptId={selectedPromptId}
          onSelectPrompt={(id) => {
            setSelectedPromptId(id);
            setIsCreating(false);
          }}
          onCreatePrompt={handleCreatePrompt}
        />
      </div>

      {/* Prompt Editor */}
      <div className="flex-1">
        {isCreating ? (
          <PromptEditor
            isNew
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        ) : selectedPromptId ? (
          <PromptEditor promptId={selectedPromptId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p className="text-lg font-medium">Select or create a prompt</p>
              <p className="text-sm mt-1">Choose a prompt from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
