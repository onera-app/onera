import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ModelConnectionFilter } from '@/stores/modelStore';

interface FilterChipsProps {
  currentFilter: ModelConnectionFilter;
  onFilterChange: (filter: ModelConnectionFilter) => void;
  availableProviders: string[];
  pinnedCount: number;
}

const FILTER_LABELS: Record<string, string> = {
  all: 'All',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  ollama: 'Ollama',
  azure: 'Azure',
  pinned: 'Pinned',
};

export const FilterChips = memo(function FilterChips({
  currentFilter,
  onFilterChange,
  availableProviders,
  pinnedCount,
}: FilterChipsProps) {
  // Build filter options based on available providers
  const filters: ModelConnectionFilter[] = ['all'];

  // Add provider filters that exist in the models
  if (availableProviders.includes('openai')) filters.push('openai');
  if (availableProviders.includes('anthropic')) filters.push('anthropic');
  if (availableProviders.includes('ollama')) filters.push('ollama');
  if (availableProviders.includes('azure')) filters.push('azure');

  // Add pinned filter if there are pinned models
  if (pinnedCount > 0) filters.push('pinned');

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none py-1 px-1">
      {filters.map((filter) => (
        <Button
          key={filter}
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange(filter)}
          className={cn(
            'h-7 px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
            currentFilter === filter
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {FILTER_LABELS[filter] || filter}
          {filter === 'pinned' && pinnedCount > 0 && (
            <span className="ml-1 text-micro opacity-70">({pinnedCount})</span>
          )}
        </Button>
      ))}
    </div>
  );
});
