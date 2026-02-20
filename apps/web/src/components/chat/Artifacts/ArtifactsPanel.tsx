import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeArtifact } from './CodeArtifact';
import { TextArtifact } from './TextArtifact';

export interface ArtifactVersion {
  content: string;
  timestamp: number;
}

export interface Artifact {
  id: string;
  type: 'code' | 'text' | 'html' | 'markdown' | 'image';
  title: string;
  content: string;
  language?: string;
  versions?: ArtifactVersion[];
}

interface ArtifactsPanelProps {
  artifacts: Artifact[];
  isOpen: boolean;
  onClose: () => void;
  onSave?: (artifactId: string, content: string) => void;
  isEditable?: boolean;
  className?: string;
}

export function ArtifactsPanel({
  artifacts,
  isOpen,
  onClose,
  onSave,
  isEditable = false,
  className,
}: ArtifactsPanelProps) {
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(
    artifacts[0]?.id || null
  );

  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId);
  const activeIndex = artifacts.findIndex((a) => a.id === activeArtifactId);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveArtifactId(artifacts[activeIndex - 1].id);
    }
  }, [activeIndex, artifacts]);

  const handleNext = useCallback(() => {
    if (activeIndex < artifacts.length - 1) {
      setActiveArtifactId(artifacts[activeIndex + 1].id);
    }
  }, [activeIndex, artifacts]);

  const handleSave = useCallback(
    (content: string) => {
      if (activeArtifact && onSave) {
        onSave(activeArtifact.id, content);
      }
    },
    [activeArtifact, onSave]
  );

  if (!isOpen || artifacts.length === 0) return null;

  return (
    <div
      className={cn(
        'w-full md:w-[500px] border-l border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 flex flex-col',
        'animate-in slide-in-from-right duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-850">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {activeArtifact?.title || 'Artifact'}
            </span>
            {artifacts.length > 1 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activeIndex + 1} of {artifacts.length}
              </span>
            )}
          </div>
        </div>

        {/* Artifact navigation */}
        {artifacts.length > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrev}
              disabled={activeIndex === 0}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleNext}
              disabled={activeIndex === artifacts.length - 1}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Tabs - show when more than 3 artifacts */}
      {artifacts.length > 3 && (
        <div className="flex gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-850 overflow-x-auto">
          {artifacts.map((artifact) => (
            <Button
              key={artifact.id}
              variant={activeArtifactId === artifact.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveArtifactId(artifact.id)}
              className="whitespace-nowrap text-xs"
            >
              {artifact.title}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {activeArtifact && (
            <ArtifactContent
              artifact={activeArtifact}
              isEditable={isEditable}
              onSave={handleSave}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ArtifactContentProps {
  artifact: Artifact;
  isEditable?: boolean;
  onSave?: (content: string) => void;
}

function ArtifactContent({ artifact, isEditable, onSave }: ArtifactContentProps) {
  switch (artifact.type) {
    case 'code':
      return (
        <CodeArtifact
          content={artifact.content}
          title={artifact.title}
          language={artifact.language}
          isEditable={isEditable}
          onSave={onSave}
          versions={artifact.versions}
        />
      );

    case 'text':
    case 'markdown':
      return (
        <TextArtifact
          content={artifact.content}
          title={artifact.title}
          isEditable={isEditable}
          onSave={onSave}
          versions={artifact.versions}
        />
      );

    case 'html':
      return (
        <div className="rounded-lg border border-gray-100 dark:border-gray-850 overflow-hidden">
          <iframe
            srcDoc={artifact.content}
            className="w-full min-h-[400px] bg-white dark:bg-gray-900"
            sandbox="allow-scripts"
            title={artifact.title}
          />
        </div>
      );

    case 'image':
      return (
        <div className="rounded-lg border border-gray-100 dark:border-gray-850 overflow-hidden">
          <img
            src={artifact.content}
            alt={artifact.title}
            className="max-w-full"
          />
        </div>
      );

    default:
      return (
        <pre className="p-4 bg-gray-100 dark:bg-gray-850 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
          {artifact.content}
        </pre>
      );
  }
}
