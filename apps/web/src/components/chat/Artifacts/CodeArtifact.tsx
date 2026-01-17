/**
 * CodeArtifact Component
 * Renders code with Monaco editor for editing and syntax highlighting
 */

import { memo, useState, useCallback, lazy, Suspense } from 'react';
import { Copy, Check, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Lazy load Monaco editor to avoid bundle bloat
const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.Editor }))
);

interface CodeVersion {
  content: string;
  timestamp: number;
}

interface CodeArtifactProps {
  content: string;
  language?: string;
  title?: string;
  isEditable?: boolean;
  onSave?: (content: string) => void;
  versions?: CodeVersion[];
  className?: string;
}

// Map common file extensions to Monaco languages
function detectLanguage(title?: string, providedLanguage?: string): string {
  if (providedLanguage) return providedLanguage;
  if (!title) return 'plaintext';

  const ext = title.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
  };

  return languageMap[ext || ''] || 'plaintext';
}

export const CodeArtifact = memo(function CodeArtifact({
  content,
  language,
  title,
  isEditable = false,
  onSave,
  versions = [],
  className,
}: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(versions.length - 1);

  const detectedLanguage = detectLanguage(title, language);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title || `code.${detectedLanguage}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content, title, detectedLanguage]);

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
          <Badge variant="secondary" className="text-xs">
            {detectedLanguage}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Version navigation */}
          {versions.length > 1 && (
            <div className="flex items-center gap-1 mr-2">
              <Button
                variant="ghost"
                size="icon-sm"
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
                size="icon-sm"
                onClick={handleNextVersion}
                disabled={currentVersionIndex === versions.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Edit toggle */}
          {isEditable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
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
          <Button variant="ghost" size="icon-sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 text-status-success-text" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* Download button */}
          <Button variant="ghost" size="icon-sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="relative">
        {isEditing ? (
          <Suspense
            fallback={
              <div className="h-[300px] flex items-center justify-center">
                <span className="text-muted-foreground">Loading editor...</span>
              </div>
            }
          >
            <MonacoEditor
              height="300px"
              language={detectedLanguage}
              value={editedContent}
              onChange={(value) => setEditedContent(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </Suspense>
        ) : (
          <pre className="p-4 overflow-x-auto text-sm bg-muted/30 max-h-[400px] overflow-y-auto">
            <code className={`language-${detectedLanguage}`}>{displayContent}</code>
          </pre>
        )}
      </div>
    </div>
  );
});
