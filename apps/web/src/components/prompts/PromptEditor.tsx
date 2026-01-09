import { useState, useEffect } from 'react';
import { usePrompt, useUpdatePrompt, useCreatePrompt } from '@/hooks/queries/usePrompts';
import { Button } from '@/components/common/Button';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

interface PromptEditorProps {
  promptId?: string;
  isNew?: boolean;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

export function PromptEditor({ promptId, isNew, onSaved, onCancel }: PromptEditorProps) {
  const { data: prompt, isLoading } = usePrompt(promptId || '');
  const updatePrompt = useUpdatePrompt();
  const createPrompt = useCreatePrompt();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load prompt data
  useEffect(() => {
    if (prompt && !isNew) {
      setName(prompt.name);
      setDescription(prompt.description || '');
      setContent(prompt.content);
      setHasChanges(false);
    } else if (isNew) {
      setName('');
      setDescription('');
      setContent('');
      setHasChanges(false);
    }
  }, [prompt, isNew]);

  // Track changes
  const handleChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  // Save prompt
  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      alert('Name and content are required');
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        const newPrompt = await createPrompt.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          content: content.trim(),
        });
        onSaved?.(newPrompt.id);
      } else if (promptId) {
        await updatePrompt.mutateAsync({
          id: promptId,
          data: {
            name: name.trim(),
            description: description.trim() || undefined,
            content: content.trim(),
          },
        });
        setHasChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, description, content]);

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading prompt...</div>
      </div>
    );
  }

  if (!prompt && !isNew) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p>Select a prompt to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNew ? 'New Prompt' : 'Edit Prompt'}
          </h2>
          {!isNew && prompt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated {dayjs(prompt.updated_at).format('MMM D, YYYY h:mm A')}
            </span>
          )}
          {hasChanges && (
            <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(isNew || onCancel) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={(!hasChanges && !isNew) || isSaving || !name.trim() || !content.trim()}
          >
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleChange(setName)(e.target.value)}
            placeholder="e.g., Code Review Helper"
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'border border-gray-200 dark:border-gray-700',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => handleChange(setDescription)(e.target.value)}
            placeholder="Brief description of what this prompt does"
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'border border-gray-200 dark:border-gray-700',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Content <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Use {'{{variable}}'} syntax for placeholders that will be filled in when using the prompt.
          </p>
          <textarea
            value={content}
            onChange={(e) => handleChange(setContent)(e.target.value)}
            placeholder="Enter your prompt template here..."
            rows={12}
            className={cn(
              'w-full px-3 py-2 rounded-lg resize-none font-mono text-sm',
              'border border-gray-200 dark:border-gray-700',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
          />
        </div>
      </div>
    </div>
  );
}
