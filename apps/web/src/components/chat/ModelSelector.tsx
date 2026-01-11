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
      <Link
        to="/workspace/connections"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
          'bg-warning/10 hover:bg-warning/20',
          'text-warning border border-warning/30',
          'transition-colors'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span className="font-medium">Add Connection</span>
      </Link>
    );
  }

  // Not unlocked
  if (!isUnlocked) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-500 dark:text-gray-400'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
        <span>Unlock to select</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || models.length === 0}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm',
          'bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-300',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors min-w-[180px]',
          isOpen && 'ring-1 ring-accent/50'
        )}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
            <span>Loading...</span>
          </>
        ) : models.length === 0 ? (
          <span className="text-gray-500">No models</span>
        ) : (
          <>
            <div className="flex-1 text-left truncate">
              <span className="font-medium">{selectedModel?.name || 'Select model'}</span>
            </div>
            <svg
              className={cn('w-4 h-4 transition-transform flex-shrink-0', isOpen && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && models.length > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700/50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700/50">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </div>

          {/* Model list */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
            {filteredModels.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No models found
              </div>
            ) : (
              groupModelsByProvider(filteredModels).map(([provider, providerModels]) => (
                <div key={provider}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 sticky top-0">
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
                          isHighlighted && 'bg-gray-100 dark:bg-gray-800',
                          isSelected && !isHighlighted && 'bg-accent/10',
                          !isHighlighted && !isSelected && 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {model.name}
                          </div>
                        </div>
                        {isSelected && (
                          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-gray-200 dark:border-gray-700/50 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">↵</kbd>
              <span>select</span>
            </div>
            <Link
              to="/workspace/connections"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="text-xs text-accent hover:underline"
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
