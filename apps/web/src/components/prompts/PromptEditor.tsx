import { useState, useEffect, useCallback } from 'react';
import { usePrompt, useUpdatePrompt, useCreatePrompt } from '@/hooks/queries/usePrompts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import dayjs from 'dayjs';
import { MessageSquareText, Save } from 'lucide-react';

interface PromptEditorProps {
  promptId?: string;
  isNew?: boolean;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

export function PromptEditor({ promptId, isNew, onSaved, onCancel }: PromptEditorProps) {
  const promptQuery = usePrompt(promptId || '');
  const prompt = promptQuery.data;
  const isLoading = promptQuery.isLoading;
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
  const handleSave = useCallback(async () => {
    if (!name.trim() || !content.trim()) {
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
  }, [content, createPrompt, description, isNew, name, onSaved, promptId, updatePrompt]);

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
  }, [handleSave]);

  if (isLoading && !isNew) {
    return (
      <div className="flex flex-col h-full bg-[var(--chat-shell-bg)] p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!prompt && !isNew) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <MessageSquareText className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a prompt to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--chat-shell-bg)] p-3 sm:p-4">
      <div className="flex flex-col h-full chat-surface-elevated border border-[var(--chat-divider)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--chat-divider)]">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <h2 className="text-base sm:text-lg font-semibold">
            {isNew ? 'New Prompt' : 'Edit Prompt'}
          </h2>
          {!isNew && prompt && (
            <span className="text-xs text-muted-foreground truncate">
              Updated {dayjs(prompt.updatedAt).format('MMM D, YYYY h:mm A')}
            </span>
          )}
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
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
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => handleChange(setName)(e.target.value)}
            placeholder="e.g., Code Review Helper"
            className="chat-surface border-[var(--chat-divider)] rounded-xl"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => handleChange(setDescription)(e.target.value)}
            placeholder="Brief description of what this prompt does"
            className="chat-surface border-[var(--chat-divider)] rounded-xl"
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">
            Content <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Use {'{{variable}}'} syntax for placeholders that will be filled in when using the prompt.
          </p>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => handleChange(setContent)(e.target.value)}
            placeholder="Enter your prompt template here..."
            rows={12}
            className="font-mono text-sm resize-none chat-surface border-[var(--chat-divider)] rounded-xl"
          />
        </div>
      </div>
      </div>
    </div>
  );
}
