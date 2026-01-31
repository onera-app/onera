import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Filter types for model selector
export type ModelConnectionFilter = 'all' | 'openai' | 'anthropic' | 'ollama' | 'azure' | 'private' | 'pinned';

interface ModelState {
  // Currently selected model ID (format: credentialId:modelName)
  selectedModelId: string | null;

  // Recently used models (MRU list)
  recentModels: string[];

  // Pinned models for quick access
  pinnedModels: string[];

  // Current filter in model selector
  connectionFilter: ModelConnectionFilter;

  // Actions
  setSelectedModel: (modelId: string) => void;
  clearSelection: () => void;
  addRecentModel: (modelId: string) => void;
  togglePinModel: (modelId: string) => void;
  isPinned: (modelId: string) => boolean;
  setConnectionFilter: (filter: ModelConnectionFilter) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModelId: null,
      recentModels: [],
      pinnedModels: [],
      connectionFilter: 'all' as ModelConnectionFilter,

      setSelectedModel: (modelId: string) => {
        const { recentModels } = get();
        // Add to recent models, removing duplicates and limiting to 5
        const updated = [modelId, ...recentModels.filter((m) => m !== modelId)].slice(0, 5);
        set({ selectedModelId: modelId, recentModels: updated });
      },

      clearSelection: () => set({ selectedModelId: null }),

      addRecentModel: (modelId: string) => {
        const { recentModels } = get();
        const updated = [modelId, ...recentModels.filter((m) => m !== modelId)].slice(0, 5);
        set({ recentModels: updated });
      },

      togglePinModel: (modelId: string) => {
        const { pinnedModels } = get();
        const isPinned = pinnedModels.includes(modelId);
        if (isPinned) {
          set({ pinnedModels: pinnedModels.filter((m) => m !== modelId) });
        } else {
          set({ pinnedModels: [...pinnedModels, modelId] });
        }
      },

      isPinned: (modelId: string) => {
        return get().pinnedModels.includes(modelId);
      },

      setConnectionFilter: (filter: ModelConnectionFilter) => {
        set({ connectionFilter: filter });
      },
    }),
    {
      name: 'onera-model',
      version: 2, // Bump version for migration
      partialize: (state): Pick<ModelState, 'selectedModelId' | 'recentModels' | 'pinnedModels' | 'connectionFilter'> => ({
        selectedModelId: state.selectedModelId,
        recentModels: state.recentModels,
        pinnedModels: state.pinnedModels,
        connectionFilter: state.connectionFilter,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<ModelState>;
        if (version < 2) {
          return {
            ...state,
            pinnedModels: [] as string[],
            connectionFilter: 'all' as ModelConnectionFilter,
          };
        }
        return state;
      },
    }
  )
);
