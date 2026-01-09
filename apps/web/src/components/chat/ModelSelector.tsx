import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { useE2EE } from '@/providers/E2EEProvider';
import { getAvailableModels, hasConnections } from '@/lib/ai';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  credentialId: string;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuthStore();
  const { isUnlocked } = useE2EE();

  // Check if user has any connections
  const { data: hasAnyConnections = false, isLoading: checkingConnections } = useQuery({
    queryKey: ['hasConnections'],
    queryFn: () => hasConnections(token!),
    enabled: !!token,
    staleTime: 30000,
  });

  // Fetch available models
  const { data: models = [], isLoading: loadingModels } = useQuery({
    queryKey: ['availableModels'],
    queryFn: () => getAvailableModels(token!),
    enabled: !!token && isUnlocked && hasAnyConnections,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Auto-select first model if none selected
  useEffect(() => {
    if (!value && models.length > 0) {
      onChange(models[0].id);
    }
  }, [models, value, onChange]);

  const selectedModel = models.find((m) => m.id === value);
  const isLoading = checkingConnections || loadingModels;

  // No connections configured - show setup prompt
  if (!checkingConnections && !hasAnyConnections) {
    return (
      <Link
        to="/workspace/connections"
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50',
          'text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>Add Connection</span>
      </Link>
    );
  }

  // Not unlocked
  if (!isUnlocked) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-500 dark:text-gray-400'
        )}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>Unlock to select model</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || models.length === 0}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
          'text-gray-700 dark:text-gray-300',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            <span>Loading models...</span>
          </>
        ) : models.length === 0 ? (
          <span>No models available</span>
        ) : (
          <>
            <span>{selectedModel?.name || 'Select model'}</span>
            {selectedModel && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({selectedModel.provider})
              </span>
            )}
            <svg
              className={cn('w-4 h-4 transition-transform ml-1', isOpen && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {isOpen && models.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 z-20 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 max-h-96 overflow-y-auto">
            {/* Group models by provider */}
            {groupModelsByProvider(models).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {provider}
                </div>
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800',
                      model.id === value && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {model.name}
                    </div>
                  </button>
                ))}
              </div>
            ))}

            {/* Add more connections link */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <Link
                to="/workspace/connections"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Manage Connections
              </Link>
            </div>
          </div>
        </>
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
