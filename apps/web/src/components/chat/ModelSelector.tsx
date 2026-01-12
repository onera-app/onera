import { useState, useEffect, useRef, useMemo, useCallback, type KeyboardEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { useE2EE } from '@/providers/E2EEProvider';
import { useCredentials } from '@/hooks/queries/useCredentials';
import {
  decryptRawCredentials,
  getAvailableModelsFromCredentials,
  type ModelOption,
  type RawCredential,
} from '@/lib/ai';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ChevronDown, Check, Lock, Search, Loader2 } from 'lucide-react';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

/**
 * Simple fuzzy search - matches if all characters appear in order
 */
function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const { isUnlocked } = useE2EE();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch credentials from Convex
  const rawCredentials = useCredentials();
  const checkingConnections = rawCredentials === undefined;
  const hasAnyConnections = rawCredentials && rawCredentials.length > 0;

  // Fetch available models when credentials change
  useEffect(() => {
    async function loadModels() {
      if (!rawCredentials || rawCredentials.length === 0 || !isUnlocked) {
        setModels([]);
        return;
      }

      setLoadingModels(true);
      try {
        const raw: RawCredential[] = rawCredentials.map(c => ({
          id: c.id,
          provider: c.provider,
          name: c.name,
          encryptedData: c.encryptedData,
          iv: c.iv,
        }));
        const decrypted = decryptRawCredentials(raw);
        const availableModels = await getAvailableModelsFromCredentials(decrypted);
        setModels(availableModels);
      } catch (err) {
        console.error('Failed to load models:', err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    }

    loadModels();
  }, [rawCredentials, isUnlocked]);

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

  // Filter models by search query with fuzzy matching
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const query = searchQuery.trim();
    return models.filter(
      (m) =>
        fuzzyMatch(m.name, query) ||
        fuzzyMatch(m.provider, query) ||
        m.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [models, searchQuery]);

  // Flat list for keyboard navigation
  const flatModelList = useMemo(() => {
    return filteredModels;
  }, [filteredModels]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, flatModelList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flatModelList[highlightedIndex]) {
      e.preventDefault();
      onChange(flatModelList[highlightedIndex].id);
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [flatModelList, highlightedIndex, onChange]);

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
  }, [searchQuery]);

  const selectedModel = models.find((m) => m.id === value);
  const isLoading = checkingConnections || loadingModels;

  // No connections configured
  if (!checkingConnections && !hasAnyConnections) {
    return (
      <Button variant="outline" asChild className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950">
        <Link to="/workspace/connections">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Add Connection
        </Link>
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
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || models.length === 0}
        className={cn(
          'min-w-[180px] justify-between',
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
            <span className="truncate font-medium">{selectedModel?.name || 'Select model'}</span>
            <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', isOpen && 'rotate-180')} />
          </>
        )}
      </Button>

      {isOpen && models.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 z-50 bg-popover rounded-xl shadow-xl border border-border overflow-hidden">
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

          {/* Model list */}
          <ScrollArea className="max-h-80">
            <div ref={listRef} className="py-1">
              {filteredModels.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No models found
                </div>
              ) : (
                groupModelsByProvider(filteredModels).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 sticky top-0">
                      {provider}
                    </div>
                    {providerModels.map((model) => {
                      const flatIndex = flatModelList.findIndex(m => m.id === model.id);
                      const isHighlighted = flatIndex === highlightedIndex;
                      const isSelected = model.id === value;

                      return (
                        <button
                          key={model.id}
                          data-model-item
                          onClick={() => {
                            onChange(model.id);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm',
                            'transition-colors',
                            isHighlighted && 'bg-accent',
                            isSelected && !isHighlighted && 'bg-primary/10',
                            !isHighlighted && !isSelected && 'hover:bg-accent'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {model.name}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Footer hint */}
          <div className="border-t border-border px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              <span>select</span>
            </div>
            <Link
              to="/workspace/connections"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="text-xs text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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
