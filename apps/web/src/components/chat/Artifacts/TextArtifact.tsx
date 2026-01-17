/**
 * TextArtifact Component
 * Renders text content with markdown preview and editing capabilities
 */

import { memo, useState, useCallback } from 'react';
import { Copy, Check, Download, ChevronLeft, ChevronRight, Edit2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TextVersion {
  content: string;
  timestamp: number;
}

interface TextArtifactProps {
  content: string;
  title?: string;
  isEditable?: boolean;
  onSave?: (content: string) => void;
  versions?: TextVersion[];
  className?: string;
}

export const TextArtifact = memo(function TextArtifact({
  content,
  title,
  isEditable = false,
  onSave,
  versions = [],
  className,
}: TextArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(versions.length - 1);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [content, title]);

  const handleSave = useCallback(() => {
    if (onSave && editedContent !== content) {
      onSave(editedContent);
    }
    setIsEditing(false);
  }, [editedContent, content, onSave]);

  const handlePrevVersion = useCallback(() => {
    if (currentVersionIndex > 0) {
      setCurrentVersionIndex(currentVersionIndex - 1);
    }
  }, [currentVersionIndex]);

  const handleNextVersion = useCallback(() => {
    if (currentVersionIndex < versions.length - 1) {
      setCurrentVersionIndex(currentVersionIndex + 1);
    }
  }, [currentVersionIndex, versions.length]);

  const displayContent = versions.length > 0
    ? versions[currentVersionIndex]?.content || content
    : content;

  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          {title && (
            <span className="text-sm font-medium text-foreground">{title}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Version navigation */}
          {versions.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevVersion}
                disabled={currentVersionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentVersionIndex + 1} / {versions.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextVersion}
                disabled={currentVersionIndex === versions.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Edit/Preview toggle */}
          {isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowPreview(!showPreview)}
              title={showPreview ? 'Edit' : 'Preview'}
            >
              {showPreview ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}

          {/* Edit toggle */}
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  setEditedContent(content);
                }
                setIsEditing(!isEditing);
              }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          )}

          {/* Save button */}
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={handleSave}>
              Save
            </Button>
          )}

          {/* Copy button */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* Download button */}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {isEditing && !showPreview ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[300px] font-mono text-sm resize-none"
            placeholder="Enter markdown content..."
          />
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{isEditing ? editedContent : displayContent}</Streamdown>
          </div>
        )}
      </div>
    </div>
  );
});
