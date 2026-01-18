/**
 * Key Sharding Module - Main Entry Point
 *
 * This module implements Privy-style key sharding for E2EE with Clerk authentication.
 *
 * SECURITY MODEL:
 * The system uses 3 shares with XOR-based splitting:
 * - Device Share: Stored encrypted in localStorage with server-provided entropy
 * - Auth Share: Stored PLAINTEXT on server, protected by Clerk authentication
 * - Recovery Share: Stored encrypted in database, decrypted with recovery phrase
 *
 * IMPORTANT: XOR-based splitting requires ALL 3 shares to reconstruct the master key.
 * For recovery scenarios, use masterKeyRecovery (master key encrypted with recovery key).
 *
 * Threat model: An attacker must compromise THREE independent systems to decrypt data:
 * 1. Database (auth share + recovery share)
 * 2. Device (device share in localStorage)
 * 3. Clerk authentication (valid session token to get auth share)
 */

// Share Manager (core sharding logic)
export {
  splitMasterKey,
  reconstructFromShares,
  reconstructFromThreeShares,
  serializeShares,
  deserializeShares,
  encryptShare,
  decryptShare,
  reshardForNewDevice,
  verifyShares,
  deriveShareEncryptionKey,
  deriveAuthShareKey,
  deriveDeviceShareKey,
  deriveLoginEncryptionKey,
  type KeyShares,
  type SerializedKeyShares,
} from './shareManager';

// Device Share (localStorage storage with server entropy)
export {
  getOrCreateDeviceId,
  getDeviceId,
  storeDeviceShare,
  getDeviceShare,
  hasDeviceShare,
  clearDeviceShare,
  clearAllDeviceData,
  getDeviceShareInfo,
  listStoredDeviceIds,
  needsDeviceShareMigration,
} from './deviceShare';

// Auth Share (Privy-style server-protected)
export {
  serializeAuthShare,
  deserializeAuthShare,
  // Legacy exports for backwards compatibility
  encryptAuthShareForStorage,
  decryptAuthShareFromStorage,
  isValidStoredAuthShare,
  extractAuthShareFromMetadata,
  createAuthShareMetadata,
  removeAuthShareFromMetadata,
  updateAuthShareInMetadata,
  type StoredAuthShare,
} from './authShare';

// Recovery Share (database storage)
export {
  encryptRecoveryShareWithKey,
  decryptRecoveryShareWithKey,
  encryptRecoveryShareWithMnemonic,
  decryptRecoveryShareWithMnemonic,
  generateRecoveryKeyAndInfo,
  isValidStoredRecoveryShare,
  serializeStoredRecoveryShare,
  deserializeStoredRecoveryShare,
  type StoredRecoveryShare,
} from './recoveryShare';

// Key Setup (orchestration)
export {
  setupUserKeysWithSharding,
  keyBundleToStorable,
  unlockWithShares,
  unlockWithRecoveryPhrase,
  unlockWithLoginKey, // Deprecated - throws error
  hasCurrentDeviceShare,
  type ShardedKeyBundle,
  type StorableKeyShares,
  type DecryptedKeys,
} from './keySetup';
