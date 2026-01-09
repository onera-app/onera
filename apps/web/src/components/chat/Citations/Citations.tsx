import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface Citation {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  source?: string;
}

interface CitationsProps {
  citations: Citation[];
  className?: string;
}

export function Citations({ citations, className }: CitationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (citations.length === 0) return null;

  const displayCitations = isExpanded ? citations : citations.slice(0, 3);

  return (
    <div className={cn('mt-3', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="font-medium">{citations.length} sources</span>
        <svg
          className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {displayCitations.map((citation, index) => (
            <CitationCard key={citation.id || index} citation={citation} index={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        {citation.url ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-1"
          >
            {citation.title}
          </a>
        ) : (
          <div className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
            {citation.title}
          </div>
        )}
        {citation.snippet && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {citation.snippet}
          </p>
        )}
        {citation.source && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {citation.source}
          </div>
        )}
      </div>
    </div>
  );
}
