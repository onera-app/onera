/**
 * AI Module - Main Exports
 * Provides direct browser-to-provider AI chat functionality with E2EE support
 */

// Types
export type {
  DecryptedCredential,
  ModelInfo,
  UseDirectChatOptions,
  ParsedModelId,
} from './types';

// Credential management
export {
  getDecryptedCredentials,
  getCredentialById,
  clearCredentialCache,
  invalidateCredentialCache,
  hasCredentialsCache,
  parseModelId,
  createModelId,
  hasConnections,
  getAvailableModels,
  type ModelOption,
} from './credentials';

// Provider factory
export {
  getModelForCredential,
  clearProviderCache,
  getDefaultBaseUrl,
  ANTHROPIC_MODELS,
} from './providers';

// Transport
export {
  DirectBrowserTransport,
  createDirectBrowserTransport,
  type DirectBrowserTransportOptions,
} from './transport';

/**
 * Clear all AI-related caches
 * Call on logout, lock, or when credentials change
 */
export function clearAllAICaches(): void {
  // Import dynamically to avoid circular dependencies
  const { clearCredentialCache } = require('./credentials');
  const { clearProviderCache } = require('./providers');

  clearCredentialCache();
  clearProviderCache();
}
