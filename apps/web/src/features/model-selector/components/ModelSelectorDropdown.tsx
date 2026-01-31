import { useState, useEffect, useRef, useMemo, useCallback, memo, type KeyboardEvent } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { useCredentials } from '@/hooks/queries/useCredentials';
import {
  decryptCredentialsWithMetadata,
  getAvailableModelsFromCredentials,
  PRIVATE_MODEL_PREFIX,
  type ModelOption,
  type PartiallyDecryptedCredential,
} from '@/lib/ai';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AlertTriangle, ChevronDown, Lock, Search, Loader2, Pin } from 'lucide-react';
import { useModelSelection } from '../hooks/useModelSelection';
import { FilterChips } from './FilterChips';
import { ModelItem } from './ModelItem';

interface ModelSelectorDropdownProps {
  value: string;
  onChange: (model: string) => void;
}

function groupModelsByProvider(models: ModelOption[]): [string, ModelOption[]][] {
  const groups = new Map<string, ModelOption[]>();

  for (const model of models) {
    const existing = groups.get(model.provider) || [];
    existing.push(model);
    groups.set(model.provider, existing);
  }

  return Array.from(groups.entries());
}

export const ModelSelectorDropdown = memo(function ModelSelectorDropdown({
  value,
  onChange,
}: ModelSelectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { isUnlocked } = useE2EE();
  const { openSettingsModal } = useUIStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch credentials
  const rawCredentials = useCredentials();
  const checkingConnections = rawCredentials === undefined;
  const hasAnyConnections = rawCredentials && rawCredentials.length > 0;

  // Fetch private inference models from server
  const { data: privateModels, isLoading: loadingPrivateModels } = trpc.enclaves.listModels.useQuery(
    undefined,
    { enabled: isUnlocked }
  );

  // Use the model selection hook
  const {
    filteredModels,
    pinnedModels,
    unpinnedModels,
    connectionFilter,
    setConnectionFilter,
    togglePin,
    isPinned,
    availableProviders,
  } = useModelSelection({
    models,
    searchQuery,
  });

  // Fetch available models when credentials or private models change
  useEffect(() => {
    async function loadModels() {
      if (!isUnlocked) {
        setModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        // Fetch credential-based models
        let credentialModels: ModelOption[] = [];
        if (rawCredentials && rawCredentials.length > 0) {
          const partial: PartiallyDecryptedCredential[] = rawCredentials.map((c) => ({
            id: c.id,
            provider: c.provider,
            name: c.name,
            encryptedData: c.encryptedData,
            iv: c.iv,
          }));
          const decrypted = decryptCredentialsWithMetadata(partial);
          credentialModels = await getAvailableModelsFromCredentials(decrypted);
        }

        // Convert private models to ModelOption format
        const privateModelOptions: ModelOption[] = (privateModels || []).map((m) => ({
          id: `${PRIVATE_MODEL_PREFIX}${m.id}`,
          name: m.displayName,
          provider: m.provider, // 'onera-private'
          credentialId: '', // No credential needed for private models
        }));

        // Merge: private models first, then credential models
        setModels([...privateModelOptions, ...credentialModels]);
      } catch (err) {
        console.error('Failed to load models:', err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [rawCredentials, isUnlocked, privateModels]);

  // Auto-select first model if none selected
  useEffect(() => {
    if (!value && models.length > 0) {
      onChange(models[0].id);
    }
  }, [models, value, onChange]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [isOpen]);

  // Flat list for keyboard navigation (pinned first, then unpinned)
  const flatModelList = useMemo(() => {
    return [...pinnedModels, ...unpinnedModels];
  }, [pinnedModels, unpinnedModels]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, flatModelList.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatModelList[highlightedIndex]) {
        e.preventDefault();
        onChange(flatModelList[highlightedIndex].id);
        setIsOpen(false);
        setSearchQuery('');
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    [flatModelList, highlightedIndex, onChange]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-model-item]');
      const highlighted = items[highlightedIndex];
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, connectionFilter]);

  // Stable callbacks for ModelItem - prevents re-renders of all items
  const handleModelSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleTogglePin = useCallback(
    (modelId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      togglePin(modelId);
    },
    [togglePin]
  );

  const selectedModel = models.find((m) => m.id === value);
  const isLoading = checkingConnections || loadingModels || loadingPrivateModels;

  // No connections and no private models
  const hasPrivateModels = privateModels && privateModels.length > 0;
  if (!checkingConnections && !loadingPrivateModels && !hasAnyConnections && !hasPrivateModels) {
    return (
      <Button
        variant="outline"
        className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
        onClick={() => openSettingsModal('connections')}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Add Connection
      </Button>
    );
  }

  // Not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-muted text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Unlock to select</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading || models.length === 0}
          className={cn(
            'h-9 min-w-[140px] sm:min-w-[180px] justify-between',
            isOpen && 'ring-1 ring-ring'
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading...</span>
            </>
          ) : models.length === 0 ? (
            <span className="text-muted-foreground">No models</span>
          ) : (
            <>
              <span className="truncate font-medium">
                {selectedModel?.name || 'Select model'}
              </span>
              <ChevronDown
                className={cn('h-4 w-4 ml-2 flex-shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </>
          )}
        </Button>

        {isOpen && models.length > 0 && (
          <div className="absolute left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] z-50 bg-popover rounded-xl shadow-xl border border-border overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter chips */}
            <div className="border-b border-border">
              <FilterChips
                currentFilter={connectionFilter}
                onFilterChange={setConnectionFilter}
                availableProviders={availableProviders}
                pinnedCount={pinnedModels.length}
              />
            </div>

            {/* Model list */}
            <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
              <div ref={listRef} className="py-1">
                {filteredModels.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No models found
                  </div>
                ) : (
                  <>
                    {/* Pinned models section */}
                    {pinnedModels.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0 flex items-center gap-1.5">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </div>
                        {pinnedModels.map((model) => {
                          const flatIndex = flatModelList.findIndex((m) => m.id === model.id);
                          return (
                            <ModelItem
                              key={model.id}
                              model={model}
                              isSelected={model.id === value}
                              isHighlighted={flatIndex === highlightedIndex}
                              isPinned={true}
                              onSelect={handleModelSelect}
                              onTogglePin={handleTogglePin}
                            />
                          );
                        })}
                        {unpinnedModels.length > 0 && <Separator className="my-1" />}
                      </>
                    )}

                    {/* Unpinned models grouped by provider */}
                    {groupModelsByProvider(unpinnedModels).map(([provider, providerModels]) => (
                      <div key={provider}>
                        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0">
                          {provider}
                        </div>
                        {providerModels.map((model) => {
                          const flatIndex = flatModelList.findIndex((m) => m.id === model.id);
                          return (
                            <ModelItem
                              key={model.id}
                              model={model}
                              isSelected={model.id === value}
                              isHighlighted={flatIndex === highlightedIndex}
                              isPinned={isPinned(model.id)}
                              onSelect={handleModelSelect}
                              onTogglePin={handleTogglePin}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Footer hint */}
            <div className="border-t border-border px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-micro">↑↓</kbd>
                <span>navigate</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-micro">↵</kbd>
                <span>select</span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                  openSettingsModal('connections');
                }}
                className="text-xs text-primary hover:underline"
              >
                Manage
              </button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
