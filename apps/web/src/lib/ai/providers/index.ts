/**
 * Provider Factory for AI SDK
 * Creates AI SDK provider instances from decrypted E2EE credentials
 */

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import type { DecryptedCredential } from '../types';

// Cache provider instances by credential ID
const providerCache = new Map<string, ReturnType<typeof createOpenAI> | ReturnType<typeof createAnthropic>>();

/**
 * Get or create a model instance for a credential
 */
export function getModelForCredential(
  credential: DecryptedCredential,
  modelName: string
): LanguageModel {
  const cacheKey = credential.id;

  let provider = providerCache.get(cacheKey);

  if (!provider) {
    switch (credential.provider) {
      case 'openai':
      case 'azure':
      case 'custom':
        provider = createOpenAI({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl || 'https://api.openai.com/v1',
          organization: credential.orgId,
        });
        break;

      case 'anthropic':
        provider = createAnthropic({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl || 'https://api.anthropic.com',
          headers: {
            // Required header for direct browser access
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        });
        break;

      case 'ollama':
        // Ollama uses OpenAI-compatible API
        provider = createOpenAI({
          apiKey: credential.apiKey || 'ollama', // Ollama doesn't require key
          baseURL: credential.baseUrl || 'http://localhost:11434/v1',
        });
        break;

      default:
        throw new Error(`Unknown provider: ${credential.provider}`);
    }

    providerCache.set(cacheKey, provider);
  }

  // Return the model instance
  // The provider function takes the model name and returns a LanguageModel
  return (provider as ReturnType<typeof createOpenAI>)(modelName);
}

/**
 * Clear the provider cache
 * Call on logout, lock, or credential changes
 */
export function clearProviderCache(): void {
  providerCache.clear();
}

/**
 * Get default base URL for a provider
 */
export function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'ollama':
      return 'http://localhost:11434/v1';
    default:
      return '';
  }
}

/**
 * Static model lists for providers without a models API
 */
export const ANTHROPIC_MODELS = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
];
