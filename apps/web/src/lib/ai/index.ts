/**
 * AI Module - Main Exports
 * Provides direct browser-to-provider AI chat functionality with E2EE support
 */

// Import for local use
import { clearCredentialCache as _clearCredentialCache } from './credentials';
import { clearProviderCache as _clearProviderCache } from './providers';

// Types
export type {
  DecryptedCredential,
  ModelInfo,
  UseDirectChatOptions,
  ParsedModelId,
} from './types';

// Credential management
export {
  decryptRawCredentials,
  setCredentialCache,
  getCredentialById,
  clearCredentialCache,
  invalidateCredentialCache,
  hasCredentialsCache,
  getCachedCredentials,
  parseModelId,
  createModelId,
  getAvailableModelsFromCredentials,
  type ModelOption,
  type RawCredential,
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
} from './transport';

// Tasks (title generation, follow-ups)
export {
  generateChatTitle,
  generateFollowUps,
} from './tasks';

/**
 * Clear all AI-related caches
 * Call on logout, lock, or when credentials change
 */
export function clearAllAICaches(): void {
  _clearCredentialCache();
  _clearProviderCache();
}
