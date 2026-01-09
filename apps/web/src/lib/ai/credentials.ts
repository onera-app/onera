/**
 * Credential Management for AI SDK
 * Handles E2EE decryption and caching of LLM credentials
 */

import { decryptCredentials, isUnlocked, secureZero } from '@cortex/crypto';
import { credentialsApi } from '@/lib/api';
import type { DecryptedCredential } from './types';
import type { LLMProvider } from '@cortex/types';

// In-memory credential cache
let cachedCredentials: DecryptedCredential[] | null = null;

/**
 * Fetch and decrypt all credentials
 */
export async function getDecryptedCredentials(token: string): Promise<DecryptedCredential[]> {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  // Return cached if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // Fetch encrypted credentials from server
  const encrypted = await credentialsApi.getAll(token);

  if (encrypted.length === 0) {
    cachedCredentials = [];
    return [];
  }

  // Decrypt using master key
  const decrypted = decryptCredentials(
    encrypted.map((c) => ({
      id: c.id,
      provider: c.provider,
      name: c.name,
      encrypted_data: c.encrypted_data,
      iv: c.iv,
    }))
  );

  // Filter failed decryptions and transform to our format
  cachedCredentials = decrypted
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

  return cachedCredentials;
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
 * Check if any credentials/connections are configured
 */
export async function hasConnections(token: string): Promise<boolean> {
  try {
    const credentials = await credentialsApi.getAll(token);
    return credentials.length > 0;
  } catch {
    return false;
  }
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
 * Static model lists for providers without dynamic model endpoints
 */
const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
];

/**
 * Fetch models from OpenAI-compatible endpoint
 */
async function fetchOpenAIModels(
  baseUrl: string,
  apiKey: string,
  orgId?: string
): Promise<{ id: string; name: string }[]> {
  try {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (orgId) {
      headers['OpenAI-Organization'] = orgId;
    }

    const response = await fetch(`${baseUrl}/models`, { headers });
    if (!response.ok) {
      console.warn(`Failed to fetch models from ${baseUrl}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const models = data.data || [];

    // Filter to chat models (GPT, Claude if proxied, etc.)
    return models
      .filter((m: { id: string }) =>
        m.id.includes('gpt') ||
        m.id.includes('claude') ||
        m.id.includes('o1') ||
        m.id.includes('o3')
      )
      .map((m: { id: string }) => ({
        id: m.id,
        name: m.id,
      }))
      .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
  } catch (error) {
    console.warn(`Error fetching OpenAI models from ${baseUrl}:`, error);
    return [];
  }
}

/**
 * Fetch models from Ollama endpoint
 */
async function fetchOllamaModels(baseUrl: string): Promise<{ id: string; name: string }[]> {
  try {
    // Ollama uses /api/tags for model listing
    const ollamaBase = baseUrl.replace('/v1', '');
    const response = await fetch(`${ollamaBase}/api/tags`);
    if (!response.ok) {
      console.warn(`Failed to fetch Ollama models: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const models = data.models || [];

    return models.map((m: { name: string; model: string }) => ({
      id: m.model || m.name,
      name: m.name,
    }));
  } catch (error) {
    console.warn('Error fetching Ollama models:', error);
    return [];
  }
}

/**
 * Get available models from all configured credentials
 */
export async function getAvailableModels(token: string): Promise<ModelOption[]> {
  if (!isUnlocked()) {
    return [];
  }

  const credentials = await getDecryptedCredentials(token);
  const allModels: ModelOption[] = [];

  for (const cred of credentials) {
    let models: { id: string; name: string }[] = [];

    switch (cred.provider) {
      case 'anthropic':
        models = ANTHROPIC_MODELS;
        break;

      case 'openai':
      case 'azure':
      case 'custom':
        models = await fetchOpenAIModels(
          cred.baseUrl || 'https://api.openai.com/v1',
          cred.apiKey,
          cred.orgId
        );
        break;

      case 'ollama':
        models = await fetchOllamaModels(cred.baseUrl || 'http://localhost:11434/v1');
        break;
    }

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
