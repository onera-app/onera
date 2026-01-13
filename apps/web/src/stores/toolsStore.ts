/**
 * Tools Store - Manages search providers and tool settings
 * API keys are encrypted using the E2EE system
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SearchProvider, SearchProviderConfig } from '@onera/types';
import {
  encryptJSON,
  decryptJSON,
  getMasterKey,
  isUnlocked,
} from '@onera/crypto';

// Search provider definitions
export const SEARCH_PROVIDERS: Array<{
  id: SearchProvider;
  name: string;
  description: string;
  docsUrl: string;
}> = [
  {
    id: 'exa',
    name: 'Exa',
    description: 'AI-powered search with neural embeddings',
    docsUrl: 'https://docs.exa.ai',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    description: 'Privacy-focused web search',
    docsUrl: 'https://brave.com/search/api/',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'Search API optimized for AI agents',
    docsUrl: 'https://tavily.com',
  },
  {
    id: 'serper',
    name: 'Serper',
    description: 'Google Search API',
    docsUrl: 'https://serper.dev',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web scraping and search',
    docsUrl: 'https://firecrawl.dev',
  },
];

interface EncryptedApiKey {
  provider: SearchProvider;
  encryptedData: string;
  iv: string;
}

interface ToolsState {
  // Search settings
  searchEnabled: boolean;
  searchEnabledByDefault: boolean;
  defaultSearchProvider: SearchProvider | null;

  // Encrypted API keys (stored in localStorage)
  encryptedApiKeys: EncryptedApiKey[];

  // Actions
  setSearchEnabled: (enabled: boolean) => void;
  setSearchEnabledByDefault: (enabled: boolean) => void;
  setDefaultSearchProvider: (provider: SearchProvider | null) => void;

  // API key management
  setProviderApiKey: (provider: SearchProvider, apiKey: string) => void;
  getProviderApiKey: (provider: SearchProvider) => string | null;
  removeProviderApiKey: (provider: SearchProvider) => void;
  hasProviderApiKey: (provider: SearchProvider) => boolean;
  getConfiguredProviders: () => SearchProvider[];
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set, get) => ({
      searchEnabled: false,
      searchEnabledByDefault: false,
      defaultSearchProvider: null,
      encryptedApiKeys: [],

      setSearchEnabled: (enabled) => set({ searchEnabled: enabled }),

      setSearchEnabledByDefault: (enabled) => set({ searchEnabledByDefault: enabled }),

      setDefaultSearchProvider: (provider) =>
        set({ defaultSearchProvider: provider }),

      setProviderApiKey: (provider, apiKey) => {
        if (!isUnlocked()) {
          throw new Error('E2EE not unlocked');
        }

        const masterKey = getMasterKey();
        const encrypted = encryptJSON({ apiKey }, masterKey);

        set((state) => {
          // Remove existing key for this provider
          const filtered = state.encryptedApiKeys.filter(
            (k) => k.provider !== provider
          );

          return {
            encryptedApiKeys: [
              ...filtered,
              {
                provider,
                encryptedData: encrypted.ciphertext,
                iv: encrypted.nonce,
              },
            ],
            // Auto-set as default if it's the first provider
            defaultSearchProvider:
              state.defaultSearchProvider || provider,
          };
        });
      },

      getProviderApiKey: (provider) => {
        if (!isUnlocked()) {
          return null;
        }

        const { encryptedApiKeys } = get();
        const stored = encryptedApiKeys.find((k) => k.provider === provider);

        if (!stored) return null;

        try {
          const masterKey = getMasterKey();
          const decrypted = decryptJSON<{ apiKey: string }>(
            { ciphertext: stored.encryptedData, nonce: stored.iv },
            masterKey
          );
          return decrypted.apiKey;
        } catch {
          console.error(`Failed to decrypt API key for ${provider}`);
          return null;
        }
      },

      removeProviderApiKey: (provider) => {
        set((state) => {
          const filtered = state.encryptedApiKeys.filter(
            (k) => k.provider !== provider
          );

          // Update default if we removed it
          const newDefault =
            state.defaultSearchProvider === provider
              ? filtered.length > 0
                ? filtered[0].provider
                : null
              : state.defaultSearchProvider;

          return {
            encryptedApiKeys: filtered,
            defaultSearchProvider: newDefault,
          };
        });
      },

      hasProviderApiKey: (provider) => {
        const { encryptedApiKeys } = get();
        return encryptedApiKeys.some((k) => k.provider === provider);
      },

      getConfiguredProviders: () => {
        const { encryptedApiKeys } = get();
        return encryptedApiKeys.map((k) => k.provider);
      },
    }),
    {
      name: 'onera-tools',
      partialize: (state) => ({
        searchEnabledByDefault: state.searchEnabledByDefault,
        defaultSearchProvider: state.defaultSearchProvider,
        encryptedApiKeys: state.encryptedApiKeys,
      }),
    }
  )
);

/**
 * Get provider config with decrypted API key
 */
export function getSearchProviderConfig(
  provider: SearchProvider
): SearchProviderConfig | null {
  const store = useToolsStore.getState();
  const apiKey = store.getProviderApiKey(provider);
  const meta = SEARCH_PROVIDERS.find((p) => p.id === provider);

  if (!meta) return null;

  return {
    id: provider,
    name: meta.name,
    enabled: store.hasProviderApiKey(provider),
    apiKey: apiKey || undefined,
  };
}

/**
 * Get the best available search provider (default or first configured)
 */
export function getPreferredSearchProvider(): SearchProvider | null {
  const store = useToolsStore.getState();
  const { defaultSearchProvider } = store;

  if (defaultSearchProvider && store.hasProviderApiKey(defaultSearchProvider)) {
    return defaultSearchProvider;
  }

  const configured = store.getConfiguredProviders();
  return configured.length > 0 ? configured[0] : null;
}
