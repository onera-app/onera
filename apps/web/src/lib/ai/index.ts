/**
 * AI Module - Main Exports
 * Provides direct browser-to-provider AI chat functionality with E2EE support
 */

// Import for local use
import { clearCredentialCache as _clearCredentialCache, invalidateModelCache as _invalidateModelCache } from './credentials';
import { clearProviderCache as _clearProviderCache, clearPrivateInferenceCache as _clearPrivateInferenceCache } from './providers';

// Types
export type {
  DecryptedCredential,
  ModelInfo,
  UseDirectChatOptions,
  ParsedModelId,
} from './types';

// Credential management
export {
  decryptCredentialsWithMetadata,
  setCredentialCache,
  getCredentialById,
  clearCredentialCache,
  invalidateCredentialCache,
  invalidateModelCache,
  hasCredentialsCache,
  getCachedCredentials,
  parseModelId,
  createModelId,
  getAvailableModelsFromCredentials,
  isPrivateModel,
  PRIVATE_MODEL_PREFIX,
  type ModelOption,
  type PartiallyDecryptedCredential,
} from './credentials';

// Provider factory
export {
  getModelForCredential,
  clearProviderCache,
  getDefaultBaseUrl,
} from './providers';

// Transport
export {
  DirectBrowserTransport,
  createDirectBrowserTransport,
  supportsNativeSearch,
  getProviderFromModelId,
  type DirectBrowserTransportOptions,
  type EnclaveConfig,
} from './transport';

// Tasks (title generation, follow-ups)
export {
  generateChatTitle,
  generateFollowUps,
  setEnclaveConfigForTasks,
} from './tasks';

/**
 * Clear all AI-related caches
 * Call on logout, lock, or when credentials change
 */
export function clearAllAICaches(): void {
  _clearCredentialCache();
  _clearProviderCache();
  _clearPrivateInferenceCache();
  _invalidateModelCache();
}
