import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Copy } from 'lucide-react';

export interface Artifact {
  id: string;
  type: 'code' | 'html' | 'markdown' | 'image';
  title: string;
  content: string;
  language?: string;
}

interface ArtifactsPanelProps {
  artifacts: Artifact[];
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ArtifactsPanel({ artifacts, isOpen, onClose, className }: ArtifactsPanelProps) {
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(
    artifacts[0]?.id || null
  );

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId);

  if (!isOpen || artifacts.length === 0) return null;

  return (
    <div
      className={cn(
        'w-[500px] border-l border-border bg-background flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold">Artifacts</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      {artifacts.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-border overflow-x-auto">
          {artifacts.map((artifact) => (
            <Button
              key={artifact.id}
              variant={activeArtifactId === artifact.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveArtifactId(artifact.id)}
              className="whitespace-nowrap"
            >
              {artifact.title}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {activeArtifact && <ArtifactContent artifact={activeArtifact} />}
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (activeArtifact) {
              navigator.clipboard.writeText(activeArtifact.content);
            }
          }}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </Button>
      </div>
    </div>
  );
}

function ArtifactContent({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case 'code':
      return (
        <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
          <code>{artifact.content}</code>
        </pre>
      );

    case 'html':
      return (
        <iframe
          srcDoc={artifact.content}
          className="w-full h-full min-h-[400px] bg-white rounded-lg border border-border"
          sandbox="allow-scripts"
          title={artifact.title}
        />
      );

    case 'markdown':
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {artifact.content}
        </div>
      );

    case 'image':
      return (
        <img
          src={artifact.content}
          alt={artifact.title}
          className="max-w-full rounded-lg"
        />
      );

    default:
      return (
        <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
          {artifact.content}
        </pre>
      );
  }
}
