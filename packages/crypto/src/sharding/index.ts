/**
 * Key Sharding Module - Main Entry Point
 *
 * This module implements Privy-style key sharding for E2EE with Clerk authentication.
 *
 * The system uses 3 shares:
 * - Device Share: Stored encrypted in localStorage
 * - Auth Share: Stored encrypted in Clerk user metadata
 * - Recovery Share: Stored encrypted in database, decrypted with recovery phrase
 *
 * Any 2 of 3 shares can reconstruct the master key.
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

// Device Share (localStorage storage)
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
} from './deviceShare';

// Auth Share (Clerk metadata storage)
export {
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
  unlockWithLoginKey,
  getCurrentDeviceShare,
  hasCurrentDeviceShare,
  type ShardedKeyBundle,
  type StorableKeyShares,
  type DecryptedKeys,
} from './keySetup';
