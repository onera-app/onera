import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, FileAttachmentIcon } from "@hugeicons/core-free-icons";
import { useState, memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

export const Citations = memo(function Citations({ citations, className }: CitationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (citations.length === 0) return null;

  const displayCitations = isExpanded ? citations : citations.slice(0, 3);

  return (
    <div className={cn('mt-3', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto py-1 px-2"
      >
        <HugeiconsIcon icon={FileAttachmentIcon} className="h-4 w-4 mr-2" />
        <span className="font-medium">{citations.length} sources</span>
        <HugeiconsIcon icon={ArrowDown01Icon} className={cn('h-3 w-3 ml-1 transition-transform', isExpanded && 'rotate-180')} />
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {displayCitations.map((citation, index) => (
            <CitationCard key={citation.id || index} citation={citation} index={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

function CitationCard({ citation, index }: { citation: Citation; index: number }) {
  return (
    <Card className="flex items-start gap-3 p-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        {citation.url ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sm hover:text-primary line-clamp-1"
          >
            {citation.title}
          </a>
        ) : (
          <div className="font-medium text-sm line-clamp-1">
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
    </Card>
  );
}
