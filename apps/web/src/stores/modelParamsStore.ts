import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Model parameters for AI inference
 * These map to common LLM API parameters
 */
export interface ModelParams {
  // Core parameters
  temperature: number; // 0-2, default 1
  topP: number; // 0-1, default 1
  topK: number; // 1-100, default 40
  maxTokens: number | null; // null = model default

  // Repetition control
  frequencyPenalty: number; // -2 to 2, default 0
  presencePenalty: number; // -2 to 2, default 0

  // Advanced
  seed: number | null; // null = random
  stopSequences: string[]; // Custom stop tokens

  // Streaming
  streamResponse: boolean;
}

export const DEFAULT_MODEL_PARAMS: ModelParams = {
  temperature: 1,
  topP: 1,
  topK: 40,
  maxTokens: null,
  frequencyPenalty: 0,
  presencePenalty: 0,
  seed: null,
  stopSequences: [],
  streamResponse: true,
};

interface ModelParamsState {
  // Global defaults
  globalParams: ModelParams;

  // Per-model overrides (modelId -> params)
  modelOverrides: Record<string, Partial<ModelParams>>;

  // System prompt
  systemPrompt: string;

  // Actions
  setGlobalParam: <K extends keyof ModelParams>(key: K, value: ModelParams[K]) => void;
  setGlobalParams: (params: Partial<ModelParams>) => void;
  resetGlobalParams: () => void;

  setModelOverride: (modelId: string, params: Partial<ModelParams>) => void;
  clearModelOverride: (modelId: string) => void;
  getEffectiveParams: (modelId: string) => ModelParams;

  setSystemPrompt: (prompt: string) => void;
}

export const useModelParamsStore = create<ModelParamsState>()(
  persist(
    (set, get) => ({
      globalParams: { ...DEFAULT_MODEL_PARAMS },
      modelOverrides: {},
      systemPrompt: '',

      setGlobalParam: (key, value) => {
        set((state) => ({
          globalParams: {
            ...state.globalParams,
            [key]: value,
          },
        }));
      },

      setGlobalParams: (params) => {
        set((state) => ({
          globalParams: {
            ...state.globalParams,
            ...params,
          },
        }));
      },

      resetGlobalParams: () => {
        set({ globalParams: { ...DEFAULT_MODEL_PARAMS } });
      },

      setModelOverride: (modelId, params) => {
        set((state) => ({
          modelOverrides: {
            ...state.modelOverrides,
            [modelId]: {
              ...state.modelOverrides[modelId],
              ...params,
            },
          },
        }));
      },

      clearModelOverride: (modelId) => {
        set((state) => {
          const { [modelId]: _, ...rest } = state.modelOverrides;
          return { modelOverrides: rest };
        });
      },

      getEffectiveParams: (modelId) => {
        const { globalParams, modelOverrides } = get();
        const overrides = modelOverrides[modelId] || {};
        return {
          ...globalParams,
          ...overrides,
        };
      },

      setSystemPrompt: (systemPrompt) => {
        set({ systemPrompt });
      },
    }),
    {
      name: 'onera-model-params',
      version: 1,
      partialize: (state): Pick<ModelParamsState, 'globalParams' | 'modelOverrides' | 'systemPrompt'> => ({
        globalParams: state.globalParams,
        modelOverrides: state.modelOverrides,
        systemPrompt: state.systemPrompt,
      }),
    }
  )
);
