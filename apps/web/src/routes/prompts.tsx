import { useState } from 'react';
import { PromptsList, PromptEditor } from '@/components/prompts';
import { MessageSquareText } from 'lucide-react';

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
      <div className="w-80 border-r border-border flex-shrink-0">
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
            <div className="text-center text-muted-foreground">
              <MessageSquareText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select or create a prompt</p>
              <p className="text-sm mt-1">Choose a prompt from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
