import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ModelState {
  // Currently selected model ID (format: credentialId:modelName)
  selectedModelId: string | null;

  // Recently used models (MRU list)
  recentModels: string[];

  // Actions
  setSelectedModel: (modelId: string) => void;
  clearSelection: () => void;
  addRecentModel: (modelId: string) => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      selectedModelId: null,
      recentModels: [],

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
    }),
    {
      name: 'cortex-model',
      partialize: (state) => ({
        selectedModelId: state.selectedModelId,
        recentModels: state.recentModels,
      }),
    }
  )
);
