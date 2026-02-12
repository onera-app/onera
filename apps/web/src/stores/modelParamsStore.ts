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

/**
 * Provider-specific settings
 */
export type ReasoningSummaryLevel = 'auto' | 'detailed' | 'none';
export type ReasoningEffort = 'low' | 'medium' | 'high';

export interface OpenAIProviderSettings {
  // Reasoning model settings
  reasoningSummary: ReasoningSummaryLevel;
  reasoningEffort: ReasoningEffort;
}

export interface AnthropicProviderSettings {
  // Extended thinking for Claude
  extendedThinking: boolean;
}

export interface ProviderSettings {
  openai: OpenAIProviderSettings;
  anthropic: AnthropicProviderSettings;
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  openai: {
    reasoningSummary: 'detailed',
    reasoningEffort: 'medium',
  },
  anthropic: {
    extendedThinking: true,
  },
};

interface ModelParamsState {
  // Global defaults
  globalParams: ModelParams;

  // Per-model overrides (modelId -> params)
  modelOverrides: Record<string, Partial<ModelParams>>;

  // System prompt
  systemPrompt: string;

  // Provider-specific settings
  providerSettings: ProviderSettings;

  // Actions
  setGlobalParam: <K extends keyof ModelParams>(key: K, value: ModelParams[K]) => void;
  setGlobalParams: (params: Partial<ModelParams>) => void;
  resetGlobalParams: () => void;

  setModelOverride: (modelId: string, params: Partial<ModelParams>) => void;
  clearModelOverride: (modelId: string) => void;
  getEffectiveParams: (modelId: string) => ModelParams;

  setSystemPrompt: (prompt: string) => void;

  // Provider settings actions
  setOpenAISettings: (settings: Partial<OpenAIProviderSettings>) => void;
  setAnthropicSettings: (settings: Partial<AnthropicProviderSettings>) => void;
  getProviderSettings: <K extends keyof ProviderSettings>(provider: K) => ProviderSettings[K];
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
          const rest = { ...state.modelOverrides };
          delete rest[modelId];
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

      providerSettings: { ...DEFAULT_PROVIDER_SETTINGS },

      setOpenAISettings: (settings) => {
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            openai: {
              ...state.providerSettings.openai,
              ...settings,
            },
          },
        }));
      },

      setAnthropicSettings: (settings) => {
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            anthropic: {
              ...state.providerSettings.anthropic,
              ...settings,
            },
          },
        }));
      },

      getProviderSettings: (provider) => {
        return get().providerSettings[provider];
      },
    }),
    {
      name: 'onera-model-params',
      version: 2,
      partialize: (state): Pick<ModelParamsState, 'globalParams' | 'modelOverrides' | 'systemPrompt' | 'providerSettings'> => ({
        globalParams: state.globalParams,
        modelOverrides: state.modelOverrides,
        systemPrompt: state.systemPrompt,
        providerSettings: state.providerSettings,
      }),
    }
  )
);
