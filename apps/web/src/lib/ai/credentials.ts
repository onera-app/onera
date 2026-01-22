/**
 * Credential Management for AI SDK
 * Handles E2EE decryption and caching of LLM credentials
 */

import {
  decryptCredentials,
  isUnlocked,
  secureZero,
} from '@onera/crypto';
import type { DecryptedCredential } from './types';
import type { LLMProvider } from '@onera/types';

// In-memory credential cache
let cachedCredentials: DecryptedCredential[] | null = null;

/**
 * Credential with pre-decrypted metadata (name/provider already decrypted by useCredentials hook)
 * Used by components that receive credentials from useCredentials()
 */
export interface PartiallyDecryptedCredential {
  id: string;
  // Already decrypted by useCredentials hook
  name: string;
  provider: string;
  // Encrypted API key data (still needs decryption)
  encryptedData: string;
  iv: string;
}

/**
 * Decrypt credentials that have pre-decrypted metadata
 * Used by components that receive credentials from useCredentials() hook
 * which already decrypts name/provider - this just decrypts the API key data
 */
export function decryptCredentialsWithMetadata(credentials: PartiallyDecryptedCredential[]): DecryptedCredential[] {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  if (credentials.length === 0) {
    return [];
  }

  // Transform to format expected by decryptCredentials
  const withMetadata = credentials.map((c) => ({
    id: c.id,
    provider: c.provider,
    name: c.name,
    encrypted_data: c.encryptedData,
    iv: c.iv,
  }));

  // Decrypt API key data using master key
  const decrypted = decryptCredentials(withMetadata);

  // Filter failed decryptions and transform to our format
  return decrypted
    .filter((c) => c.api_key && !c.api_key.includes('[Decryption failed]'))
    .map((c) => ({
      id: c.id,
      provider: c.provider as LLMProvider,
      name: c.name,
      apiKey: c.api_key,
      baseUrl: c.base_url,
      orgId: c.org_id,
      config: c.config,
    }));
}

/**
 * Set the credential cache directly
 * Used by hooks that fetch and decrypt credentials via Convex
 */
export function setCredentialCache(credentials: DecryptedCredential[]): void {
  cachedCredentials = credentials;
}

/**
 * Get a credential by ID from cache
 */
export function getCredentialById(id: string): DecryptedCredential | undefined {
  return cachedCredentials?.find((c) => c.id === id);
}

/**
 * Clear credential cache securely
 * Call on logout, lock, or credential changes
 */
export function clearCredentialCache(): void {
  if (cachedCredentials) {
    // Securely zero out API keys before clearing
    for (const cred of cachedCredentials) {
      if (cred.apiKey) {
        // Convert to Uint8Array and zero it
        const keyBytes = new TextEncoder().encode(cred.apiKey);
        secureZero(keyBytes);
        cred.apiKey = '';
      }
      if (cred.orgId) {
        cred.orgId = '';
      }
    }
  }
  cachedCredentials = null;
}

/**
 * Invalidate cache (forces refetch on next access)
 */
export function invalidateCredentialCache(): void {
  clearCredentialCache();
}

/**
 * Check if credentials are cached and available
 */
export function hasCredentialsCache(): boolean {
  return cachedCredentials !== null && cachedCredentials.length > 0;
}

/**
 * Get cached credentials
 */
export function getCachedCredentials(): DecryptedCredential[] {
  return cachedCredentials || [];
}

/**
 * Parse model ID to extract credential ID and model name
 * Format: credentialId:modelName
 */
export function parseModelId(modelId: string): { credentialId: string; modelName: string } {
  const colonIndex = modelId.indexOf(':');
  if (colonIndex === -1) {
    // No credential ID prefix, treat entire string as model name
    return { credentialId: '', modelName: modelId };
  }

  return {
    credentialId: modelId.slice(0, colonIndex),
    modelName: modelId.slice(colonIndex + 1),
  };
}

/**
 * Create a model ID from components
 */
export function createModelId(credentialId: string, modelName: string): string {
  return `${credentialId}:${modelName}`;
}

/**
 * Model info returned from getAvailableModels
 */
export interface ModelOption {
  id: string; // Format: credentialId:modelName
  name: string;
  provider: string;
  credentialId: string;
}


/**
 * Provider endpoint configurations for model fetching
 * Inspired by open-webui's unified approach
 */
interface ProviderEndpointConfig {
  getUrl: (baseUrl?: string, apiKey?: string) => string;
  getHeaders: (apiKey: string, orgId?: string) => HeadersInit;
  parseResponse: (data: unknown) => { id: string; name: string }[];
  filterModels?: (models: { id: string; name: string }[]) => { id: string; name: string }[];
}

// Excluded model patterns for OpenAI (non-chat models)
const OPENAI_EXCLUDED_PATTERNS = ['babbage', 'davinci', 'embedding', 'tts', 'whisper', 'dall-e'];

const PROVIDER_ENDPOINTS: Record<string, ProviderEndpointConfig> = {
  // OpenAI and OpenAI-compatible providers use Bearer auth and /models endpoint
  openai: {
    getUrl: (baseUrl) => `${baseUrl || 'https://api.openai.com/v1'}/models`,
    getHeaders: (apiKey, orgId) => ({
      'Authorization': `Bearer ${apiKey}`,
      ...(orgId && { 'OpenAI-Organization': orgId }),
    }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
    filterModels: (models) => models.filter((m) => !OPENAI_EXCLUDED_PATTERNS.some((p) => m.id.includes(p))),
  },

  anthropic: {
    getUrl: () => 'https://api.anthropic.com/v1/models',
    getHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    parseResponse: (data) => ((data as { data?: { id: string; display_name?: string }[] }).data || [])
      .map((m) => ({ id: m.id, name: m.display_name || m.id })),
    filterModels: (models) => models.filter((m) => m.id.includes('claude')),
  },

  google: {
    getUrl: (_, apiKey) => `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    getHeaders: () => ({}), // Auth is in URL
    parseResponse: (data) => ((data as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] }).models || [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name.replace('models/', '') })),
  },

  xai: {
    getUrl: (baseUrl) => `${baseUrl || 'https://api.x.ai/v1'}/models`,
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },

  groq: {
    getUrl: (baseUrl) => `${baseUrl || 'https://api.groq.com/openai/v1'}/models`,
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },

  mistral: {
    getUrl: (baseUrl) => `${baseUrl || 'https://api.mistral.ai/v1'}/models`,
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },

  deepseek: {
    getUrl: (baseUrl) => `${baseUrl || 'https://api.deepseek.com'}/models`,
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },

  openrouter: {
    getUrl: () => 'https://openrouter.ai/api/v1/models',
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string; name?: string }[] }).data || [])
      .map((m) => ({ id: m.id, name: m.name || m.id })),
  },

  together: {
    getUrl: () => 'https://api.together.xyz/v1/models',
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => (Array.isArray(data) ? data : [])
      .filter((m: { type?: string }) => m.type === 'chat' || !m.type)
      .map((m: { id: string; display_name?: string }) => ({ id: m.id, name: m.display_name || m.id })),
  },

  fireworks: {
    getUrl: () => 'https://api.fireworks.ai/inference/v1/models',
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || [])
      .map((m) => ({ id: m.id, name: m.id.split('/').pop() || m.id })),
  },

  ollama: {
    getUrl: (baseUrl) => `${(baseUrl || 'http://localhost:11434').replace('/v1', '')}/api/tags`,
    getHeaders: () => ({}), // No auth needed
    parseResponse: (data) => ((data as { models?: { name: string; model?: string }[] }).models || [])
      .map((m) => ({ id: m.model || m.name, name: m.name })),
  },

  lmstudio: {
    getUrl: (baseUrl) => `${baseUrl || 'http://localhost:1234/v1'}/models`,
    getHeaders: () => ({}), // No auth needed
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },

  custom: {
    getUrl: (baseUrl) => `${baseUrl}/models`,
    getHeaders: (apiKey) => {
      const headers: HeadersInit = {};
      if (apiKey) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
      }
      return headers;
    },
    parseResponse: (data) => ((data as { data?: { id: string }[] }).data || []).map((m) => ({ id: m.id, name: m.id })),
  },
};

/**
 * Unified model fetching function
 * Fetches models from any supported provider using provider-specific configuration
 */
async function fetchModelsForProvider(
  provider: string,
  apiKey: string,
  baseUrl?: string,
  orgId?: string
): Promise<{ id: string; name: string }[]> {
  const config = PROVIDER_ENDPOINTS[provider];
  if (!config) {
    console.warn(`Unknown provider: ${provider}`);
    return [];
  }

  try {
    const url = config.getUrl(baseUrl, apiKey);
    const headers = config.getHeaders(apiKey, orgId);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.warn(`Failed to fetch ${provider} models: ${response.status}`);
      return [];
    }

    const data = await response.json();
    let models = config.parseResponse(data);

    // Apply provider-specific filtering if defined
    if (config.filterModels) {
      models = config.filterModels(models);
    }

    return models.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.warn(`Error fetching ${provider} models:`, error);
    return [];
  }
}

/**
 * Get available models from decrypted credentials
 */
export async function getAvailableModelsFromCredentials(credentials: DecryptedCredential[]): Promise<ModelOption[]> {
  if (!isUnlocked()) {
    return [];
  }

  const allModels: ModelOption[] = [];

  // Fetch models from all credentials in parallel
  const modelPromises = credentials.map(async (cred) => {
    const models = await fetchModelsForProvider(
      cred.provider,
      cred.apiKey,
      cred.baseUrl,
      cred.orgId
    );
    return { cred, models };
  });

  const results = await Promise.all(modelPromises);

  for (const { cred, models } of results) {
    // Add credential prefix to model IDs
    for (const model of models) {
      allModels.push({
        id: createModelId(cred.id, model.id),
        name: model.name,
        provider: cred.name || cred.provider,
        credentialId: cred.id,
      });
    }
  }

  return allModels;
}
