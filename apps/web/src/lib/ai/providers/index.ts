/**
 * Provider Factory for AI SDK
 * Creates AI SDK provider instances from decrypted E2EE credentials
 */

export {
  createPrivateInferenceModel,
  getPrivateInferenceModel,
  clearPrivateInferenceCache,
} from './private-inference';

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createGroq } from '@ai-sdk/groq';
import { createXai } from '@ai-sdk/xai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { DecryptedCredential } from '../types';

// Type for provider instances
type ProviderInstance =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createAnthropic>
  | ReturnType<typeof createGoogleGenerativeAI>
  | ReturnType<typeof createMistral>
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createXai>
  | ReturnType<typeof createDeepSeek>
  | ReturnType<typeof createOpenAICompatible>;

// Cache provider instances by credential ID
const providerCache = new Map<string, ProviderInstance>();

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

      case 'google':
        provider = createGoogleGenerativeAI({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl,
        });
        break;

      case 'xai':
        provider = createXai({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl,
        });
        break;

      case 'groq':
        provider = createGroq({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl,
        });
        break;

      case 'mistral':
        provider = createMistral({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl,
        });
        break;

      case 'deepseek':
        provider = createDeepSeek({
          apiKey: credential.apiKey,
          baseURL: credential.baseUrl,
        });
        break;

      case 'openrouter':
        provider = createOpenAICompatible({
          name: 'openrouter',
          apiKey: credential.apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
        });
        break;

      case 'together':
        provider = createOpenAICompatible({
          name: 'together',
          apiKey: credential.apiKey,
          baseURL: 'https://api.together.xyz/v1',
        });
        break;

      case 'fireworks':
        provider = createOpenAICompatible({
          name: 'fireworks',
          apiKey: credential.apiKey,
          baseURL: 'https://api.fireworks.ai/inference/v1',
        });
        break;

      case 'ollama':
        // Ollama uses OpenAI-compatible API
        provider = createOpenAICompatible({
          name: 'ollama',
          apiKey: credential.apiKey || 'ollama', // Ollama doesn't require key
          baseURL: credential.baseUrl || 'http://localhost:11434/v1',
        });
        break;

      case 'lmstudio':
        // LM Studio uses OpenAI-compatible API
        provider = createOpenAICompatible({
          name: 'lmstudio',
          apiKey: credential.apiKey || 'lmstudio',
          baseURL: credential.baseUrl || 'http://localhost:1234/v1',
        });
        break;

      case 'custom':
        // Custom OpenAI-compatible endpoint
        provider = createOpenAICompatible({
          name: 'custom',
          apiKey: credential.apiKey || 'custom',
          baseURL: credential.baseUrl || '',
        });
        break;

      default:
        throw new Error(`Unknown provider: ${credential.provider}`);
    }

    providerCache.set(cacheKey, provider);
  }

  // Return the model instance
  // Different providers have different methods to get models
  if (credential.provider === 'google') {
    return (provider as ReturnType<typeof createGoogleGenerativeAI>)(modelName);
  } else if (credential.provider === 'anthropic') {
    return (provider as ReturnType<typeof createAnthropic>)(modelName);
  } else if (credential.provider === 'mistral') {
    return (provider as ReturnType<typeof createMistral>)(modelName);
  } else if (credential.provider === 'groq') {
    return (provider as ReturnType<typeof createGroq>)(modelName);
  } else if (credential.provider === 'xai') {
    return (provider as ReturnType<typeof createXai>)(modelName);
  } else if (credential.provider === 'deepseek') {
    return (provider as ReturnType<typeof createDeepSeek>)(modelName);
  } else if (['openrouter', 'together', 'fireworks', 'ollama', 'lmstudio', 'custom'].includes(credential.provider)) {
    return (provider as ReturnType<typeof createOpenAICompatible>).chatModel(modelName);
  } else {
    // OpenAI - AI SDK 5+ uses Responses API by default and auto-selects correct API
    return (provider as ReturnType<typeof createOpenAI>)(modelName);
  }
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
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'xai':
      return 'https://api.x.ai/v1';
    case 'groq':
      return 'https://api.groq.com/openai/v1';
    case 'mistral':
      return 'https://api.mistral.ai/v1';
    case 'deepseek':
      return 'https://api.deepseek.com';
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'together':
      return 'https://api.together.xyz/v1';
    case 'fireworks':
      return 'https://api.fireworks.ai/inference/v1';
    case 'ollama':
      return 'http://localhost:11434/v1';
    case 'lmstudio':
      return 'http://localhost:1234/v1';
    default:
      return '';
  }
}
