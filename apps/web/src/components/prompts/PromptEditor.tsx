import { useState, useEffect } from 'react';
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
      <div className="flex flex-col h-full bg-background p-6">
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {isNew ? 'New Prompt' : 'Edit Prompt'}
          </h2>
          {!isNew && prompt && (
            <span className="text-xs text-muted-foreground">
              Updated {dayjs(prompt.updated_at).format('MMM D, YYYY h:mm A')}
            </span>
          )}
          {hasChanges && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Unsaved changes
            </Badge>
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
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
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
            className="font-mono text-sm resize-none"
          />
        </div>
      </div>
    </div>
  );
}
