import { useState } from 'react';
import { PromptsList, PromptEditor } from '@/components/prompts';
import { cn } from '@/lib/utils';
import { MessageSquareText, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PromptsPage() {
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [showList, setShowList] = useState(true);

  const handleCreatePrompt = () => {
    setSelectedPromptId('');
    setIsCreating(true);
    // On mobile, switch to editor view
    if (window.innerWidth < 768) {
      setShowList(false);
    }
  };

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id);
    setIsCreating(false);
    // On mobile, switch to editor view when a prompt is selected
    if (window.innerWidth < 768) {
      setShowList(false);
    }
  };

  const handleSaved = (id: string) => {
    setSelectedPromptId(id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setShowList(true);
  };

  const handleBackToList = () => {
    setShowList(true);
    setSelectedPromptId('');
    setIsCreating(false);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Prompts List Sidebar */}
      <div className={cn(
        'border-r border-border flex-shrink-0 transition-all duration-200',
        // Mobile: full width or hidden
        'w-full md:w-80',
        // Hide on mobile when prompt is selected or creating
        !showList && 'hidden md:block'
      )}>
        <PromptsList
          selectedPromptId={selectedPromptId}
          onSelectPrompt={handleSelectPrompt}
          onCreatePrompt={handleCreatePrompt}
        />
      </div>

      {/* Prompt Editor */}
      <div className={cn(
        'flex-1 min-w-0',
        // Hide on mobile when showing list
        showList && !selectedPromptId && !isCreating && 'hidden md:block'
      )}>
        {isCreating ? (
          <div className="h-full flex flex-col">
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prompts
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PromptEditor
                isNew
                onSaved={handleSaved}
                onCancel={handleCancel}
              />
            </div>
          </div>
        ) : selectedPromptId ? (
          <div className="h-full flex flex-col">
            {/* Mobile back button */}
            <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prompts
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PromptEditor promptId={selectedPromptId} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center text-muted-foreground">
              <MessageSquareText className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
              <p className="text-base sm:text-lg font-medium">Select or create a prompt</p>
              <p className="text-sm mt-1">Choose a prompt from the sidebar to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
