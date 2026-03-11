/**
 * AI Module Type Definitions
 */

import type { LLMProvider } from '@onera/types';

/**
 * Decrypted credential ready for use with AI SDK providers
 */
export interface DecryptedCredential {
  id: string;
  provider: LLMProvider;
  name: string;
  apiKey: string;
  baseUrl?: string;
  orgId?: string;
  config?: Record<string, unknown>;
}

/**
 * Model info with credential reference
 */
export interface ModelInfo {
  id: string; // Format: credentialId:modelName
  name: string;
  provider: string;
  credentialId: string;
}

/**
 * Options for the direct chat hook
 */
export interface UseDirectChatOptions {
  chatId: string;
  selectedModelId: string; // Format: credentialId:modelName
  onFinish?: (message: { id: string; role: string; content: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Parsed model ID components
 */
export interface ParsedModelId {
  credentialId: string;
  modelName: string;
}

/**
 * Provider cache entry
 */
export interface ProviderCacheEntry {
  provider: unknown;
  credential: DecryptedCredential;
}

/**
 * Enclave configuration for private inference
 */
export interface EnclaveConfig {
  endpoint: import('@onera/types').EnclaveEndpoint;
  wsEndpoint: string;
  attestationEndpoint: string;
  expectedMeasurements?: { launch_digest: string };
  /**
   * Allow unverified attestation (development only).
   * WARNING: Setting this to true bypasses signature verification.
   * This should NEVER be true in production.
   */
  allowUnverified?: boolean;
}
