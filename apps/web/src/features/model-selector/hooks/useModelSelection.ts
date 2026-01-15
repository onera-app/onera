import { useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useModelStore, type ModelConnectionFilter } from '@/stores/modelStore';
import type { ModelOption } from '@/lib/ai';

interface UseModelSelectionProps {
  models: ModelOption[];
  searchQuery: string;
}

interface UseModelSelectionReturn {
  // Filtered and sorted models
  filteredModels: ModelOption[];
  pinnedModels: ModelOption[];
  unpinnedModels: ModelOption[];

  // Filter state
  connectionFilter: ModelConnectionFilter;
  setConnectionFilter: (filter: ModelConnectionFilter) => void;

  // Pinning actions
  togglePin: (modelId: string) => void;
  isPinned: (modelId: string) => boolean;

  // Available providers for filter chips
  availableProviders: string[];
}

/**
 * Hook for model selection with fuzzy search, filtering, and pinning
 */
export function useModelSelection({
  models,
  searchQuery,
}: UseModelSelectionProps): UseModelSelectionReturn {
  const {
    pinnedModels: pinnedModelIds,
    connectionFilter,
    togglePinModel,
    isPinned,
    setConnectionFilter,
  } = useModelStore();

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(models, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'provider', weight: 1 },
        { name: 'id', weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
    });
  }, [models]);

  // Get available providers from models
  const availableProviders = useMemo(() => {
    const providers = new Set(models.map((m) => m.provider.toLowerCase()));
    return Array.from(providers).sort();
  }, [models]);

  // Apply search and filters
  const filteredModels = useMemo(() => {
    let results = models;

    // Apply fuzzy search if query exists
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      results = searchResults.map((r) => r.item);
    }

    // Apply connection filter
    if (connectionFilter !== 'all') {
      if (connectionFilter === 'pinned') {
        results = results.filter((m) => pinnedModelIds.includes(m.id));
      } else {
        results = results.filter(
          (m) => m.provider.toLowerCase() === connectionFilter.toLowerCase()
        );
      }
    }

    return results;
  }, [models, searchQuery, connectionFilter, pinnedModelIds, fuse]);

  // Separate pinned and unpinned models for display
  const pinnedModels = useMemo(() => {
    return filteredModels.filter((m) => pinnedModelIds.includes(m.id));
  }, [filteredModels, pinnedModelIds]);

  const unpinnedModels = useMemo(() => {
    return filteredModels.filter((m) => !pinnedModelIds.includes(m.id));
  }, [filteredModels, pinnedModelIds]);

  // Pin toggle handler
  const togglePin = useCallback(
    (modelId: string) => {
      togglePinModel(modelId);
    },
    [togglePinModel]
  );

  return {
    filteredModels,
    pinnedModels,
    unpinnedModels,
    connectionFilter,
    setConnectionFilter,
    togglePin,
    isPinned,
    availableProviders,
  };
}
