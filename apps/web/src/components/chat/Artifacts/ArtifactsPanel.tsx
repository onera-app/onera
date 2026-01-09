import { useState } from 'react';
import { cn } from '@/lib/utils';

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
        'w-[500px] border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white">Artifacts</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      {artifacts.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              onClick={() => setActiveArtifactId(artifact.id)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap',
                activeArtifactId === artifact.id
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {artifact.title}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeArtifact && <ArtifactContent artifact={activeArtifact} />}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => {
            if (activeArtifact) {
              navigator.clipboard.writeText(activeArtifact.content);
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          Copy
        </button>
      </div>
    </div>
  );
}

function ArtifactContent({ artifact }: { artifact: Artifact }) {
  switch (artifact.type) {
    case 'code':
      return (
        <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-sm">
          <code className="text-gray-800 dark:text-gray-200">{artifact.content}</code>
        </pre>
      );

    case 'html':
      return (
        <iframe
          srcDoc={artifact.content}
          className="w-full h-full min-h-[400px] bg-white rounded-lg border border-gray-200 dark:border-gray-700"
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
        <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">
          {artifact.content}
        </pre>
      );
  }
}
