/**
 * Key Setup Module
 * Orchestrates the key generation and sharding process for new users
 * and handles key reconstruction for returning users
 */

import { generateSecretKey } from '../sodium/symmetric';
import { generateKeyPair, type KeyPair } from '../sodium/asymmetric';
import { encryptKey, decryptKey } from '../sodium/symmetric';
import { toBase64, fromBase64, secureZero, type EncryptedData } from '../sodium/utils';
import { type RecoveryKeyInfo } from '../sodium/recoveryKey';

import {
  splitMasterKey,
  reconstructFromThreeShares,
  verifyShares,
  deriveLoginEncryptionKey,
  type KeyShares,
} from './shareManager';
import { storeDeviceShare, getDeviceShare, getOrCreateDeviceId } from './deviceShare';
import { encryptAuthShareForStorage, type StoredAuthShare } from './authShare';
import {
  encryptRecoveryShareWithKey,
  generateRecoveryKeyAndInfo,
  type StoredRecoveryShare,
  serializeStoredRecoveryShare,
} from './recoveryShare';

/**
 * Complete key bundle for a new user with sharding
 */
export interface ShardedKeyBundle {
  // Master key (should be cleared after use)
  masterKey: Uint8Array;

  // Key pair
  keyPair: KeyPair;

  // Shares for storage
  shares: KeyShares;

  // Recovery info to show user
  recoveryInfo: RecoveryKeyInfo;

  // Encrypted data for storage
  encryptedPrivateKey: EncryptedData;
  encryptedRecoveryShare: StoredRecoveryShare;
  encryptedAuthShare: StoredAuthShare;

  // Public key (base64)
  publicKey: string;

  // Pre-computed storable keys (ready for database)
  storableKeys: StorableKeyShares;
}

/**
 * Data to store in the database for key shares
 */
export interface StorableKeyShares {
  // Auth share (encrypted, backup in case Clerk fails)
  encryptedAuthShare: string;
  authShareNonce: string;

  // Recovery share (encrypted with recovery key)
  encryptedRecoveryShare: string;
  recoveryShareNonce: string;

  // Key pair
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;

  // Master key encrypted with recovery key (for recovery via mnemonic)
  masterKeyRecovery: string;
  masterKeyRecoveryNonce: string;

  // Encrypted recovery key (for display to user later)
  encryptedRecoveryKey: string;
  recoveryKeyNonce: string;

  // Master key encrypted with user-ID-derived key (for normal login)
  encryptedMasterKeyForLogin: string;
  masterKeyForLoginNonce: string;
}

/**
 * Generate all keys and shares for a new user registration
 *
 * @param clerkUserId - The Clerk user ID for auth share encryption
 * @returns Key bundle with all generated keys and encrypted shares (ready to store)
 */
export async function setupUserKeysWithSharding(
  clerkUserId: string
): Promise<ShardedKeyBundle> {
  // 1. Generate master key
  const masterKey = generateSecretKey();

  // 2. Generate key pair
  const keyPair = generateKeyPair();

  // 3. Split master key into 3 shares
  const shares = splitMasterKey(masterKey);

  // 4. Verify shares reconstruct correctly
  if (!verifyShares(shares, masterKey)) {
    throw new Error('Share verification failed - this should never happen');
  }

  // 5. Generate recovery key and info
  const { recoveryKey, recoveryInfo } = generateRecoveryKeyAndInfo();

  // 6. Encrypt private key with master key
  const encryptedPrivateKey = encryptKey(keyPair.privateKey, masterKey);

  // 7. Encrypt recovery share with recovery key
  const encryptedRecoveryShare = encryptRecoveryShareWithKey(
    shares.recoveryShare,
    recoveryKey
  );

  // 8. Encrypt auth share for Clerk storage
  const encryptedAuthShare = encryptAuthShareForStorage(
    shares.authShare,
    clerkUserId
  );

  // 9. Store device share locally
  const deviceId = getOrCreateDeviceId();
  storeDeviceShare(shares.deviceShare, deviceId);

  // 10. Compute storable keys BEFORE zeroing recovery key
  // Encrypt master key with recovery key (for recovery phrase display)
  const masterKeyRecovery = encryptKey(masterKey, recoveryKey);

  // Encrypt recovery key with master key (for viewing recovery phrase later)
  const encryptedRecoveryKeyData = encryptKey(recoveryKey, masterKey);

  // Encrypt master key with user-ID-derived key (for normal login)
  const loginEncryptionKey = deriveLoginEncryptionKey(clerkUserId);
  const masterKeyForLogin = encryptKey(masterKey, loginEncryptionKey);
  secureZero(loginEncryptionKey);

  const publicKeyBase64 = toBase64(keyPair.publicKey);

  const storableKeys: StorableKeyShares = {
    encryptedAuthShare: encryptedAuthShare.encrypted,
    authShareNonce: encryptedAuthShare.nonce,
    ...serializeStoredRecoveryShare(encryptedRecoveryShare),
    publicKey: publicKeyBase64,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
    masterKeyRecovery: masterKeyRecovery.ciphertext,
    masterKeyRecoveryNonce: masterKeyRecovery.nonce,
    encryptedRecoveryKey: encryptedRecoveryKeyData.ciphertext,
    recoveryKeyNonce: encryptedRecoveryKeyData.nonce,
    encryptedMasterKeyForLogin: masterKeyForLogin.ciphertext,
    masterKeyForLoginNonce: masterKeyForLogin.nonce,
  };

  // 11. Clean up sensitive data from shares (keep master key for caller)
  secureZero(shares.deviceShare);
  secureZero(shares.authShare);
  secureZero(shares.recoveryShare);
  secureZero(recoveryKey);

  return {
    masterKey,
    keyPair,
    shares, // Note: shares are zeroed, only for structure
    recoveryInfo,
    encryptedPrivateKey,
    encryptedRecoveryShare,
    encryptedAuthShare,
    publicKey: publicKeyBase64,
    storableKeys,
  };
}

/**
 * Convert key bundle to database-storable format
 * @deprecated Use bundle.storableKeys directly from setupUserKeysWithSharding instead
 */
export function keyBundleToStorable(
  bundle: ShardedKeyBundle,
  recoveryKey: Uint8Array,
  masterKey: Uint8Array,
  clerkUserId: string
): StorableKeyShares {
  // Encrypt master key with recovery key (for recovery phrase display)
  const masterKeyRecovery = encryptKey(masterKey, recoveryKey);

  // Encrypt recovery key with master key (for viewing recovery phrase later)
  const encryptedRecoveryKey = encryptKey(recoveryKey, masterKey);

  // Encrypt master key with user-ID-derived key (for normal login)
  const loginEncryptionKey = deriveLoginEncryptionKey(clerkUserId);
  const masterKeyForLogin = encryptKey(masterKey, loginEncryptionKey);
  secureZero(loginEncryptionKey);

  return {
    encryptedAuthShare: bundle.encryptedAuthShare.encrypted,
    authShareNonce: bundle.encryptedAuthShare.nonce,
    ...serializeStoredRecoveryShare(bundle.encryptedRecoveryShare),
    publicKey: bundle.publicKey,
    encryptedPrivateKey: bundle.encryptedPrivateKey.ciphertext,
    privateKeyNonce: bundle.encryptedPrivateKey.nonce,
    masterKeyRecovery: masterKeyRecovery.ciphertext,
    masterKeyRecoveryNonce: masterKeyRecovery.nonce,
    encryptedRecoveryKey: encryptedRecoveryKey.ciphertext,
    recoveryKeyNonce: encryptedRecoveryKey.nonce,
    encryptedMasterKeyForLogin: masterKeyForLogin.ciphertext,
    masterKeyForLoginNonce: masterKeyForLogin.nonce,
  };
}

/**
 * Decrypted keys after successful unlock
 */
export interface DecryptedKeys {
  masterKey: Uint8Array;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Unlock user keys using device share + auth share + recovery share
 * This is for recovery scenarios where the user provides their mnemonic
 */
export function unlockWithShares(
  deviceShare: Uint8Array,
  authShare: Uint8Array,
  recoveryShare: Uint8Array,
  storedKeys: {
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys {
  // Reconstruct master key from shares
  const masterKey = reconstructFromThreeShares(deviceShare, authShare, recoveryShare);

  // Decrypt private key
  const privateKey = decryptKey(
    {
      ciphertext: storedKeys.encryptedPrivateKey,
      nonce: storedKeys.privateKeyNonce,
    },
    masterKey
  );

  const publicKey = fromBase64(storedKeys.publicKey);

  return {
    masterKey,
    privateKey,
    publicKey,
  };
}

/**
 * Unlock user keys using the login encryption key (derived from user ID)
 * This is the primary unlock flow for normal logins - simpler and doesn't require shares
 */
export function unlockWithLoginKey(
  clerkUserId: string,
  storedKeys: {
    encryptedMasterKeyForLogin: string;
    masterKeyForLoginNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys {
  // Derive the login encryption key from user ID
  const loginEncryptionKey = deriveLoginEncryptionKey(clerkUserId);

  try {
    // Decrypt master key
    const masterKey = decryptKey(
      {
        ciphertext: storedKeys.encryptedMasterKeyForLogin,
        nonce: storedKeys.masterKeyForLoginNonce,
      },
      loginEncryptionKey
    );

    // Decrypt private key using master key
    const privateKey = decryptKey(
      {
        ciphertext: storedKeys.encryptedPrivateKey,
        nonce: storedKeys.privateKeyNonce,
      },
      masterKey
    );

    const publicKey = fromBase64(storedKeys.publicKey);

    return {
      masterKey,
      privateKey,
      publicKey,
    };
  } finally {
    secureZero(loginEncryptionKey);
  }
}

/**
 * Unlock using recovery phrase when device share is missing
 * Creates new device share for current device
 */
export function unlockWithRecoveryAndReshard(
  mnemonic: string,
  authShare: Uint8Array,
  storedKeys: {
    encryptedRecoveryShare: string;
    recoveryShareNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys & { newDeviceShare: Uint8Array; newRecoveryShare: Uint8Array } {
  // Import here to avoid circular dependency
  const { mnemonicToRecoveryKey } = require('../sodium/recoveryKey');
  const { decryptRecoveryShareWithKey } = require('./recoveryShare');

  // Derive recovery key from mnemonic
  const recoveryKey = mnemonicToRecoveryKey(mnemonic);

  try {
    // Decrypt recovery share
    const recoveryShare = decryptRecoveryShareWithKey(
      {
        version: 1 as const,
        encrypted: storedKeys.encryptedRecoveryShare,
        nonce: storedKeys.recoveryShareNonce,
        createdAt: 0,
      },
      recoveryKey
    );

    // Note: The XOR-based 3-share system requires all 3 shares to reconstruct.
    // Without the real device share, we can't reconstruct the master key.
    // Use the masterKeyRecovery field instead (master key encrypted with recovery key).
    void recoveryShare; // Decrypted but reconstruction needs device share
    void authShare; // Would be needed for reconstruction with device share
    throw new Error('Direct recovery without device share requires masterKeyRecovery - use unlockWithRecoveryKey instead');
  } finally {
    secureZero(recoveryKey);
  }
}

/**
 * Get the device share for the current device
 */
export function getCurrentDeviceShare(): Uint8Array | null {
  return getDeviceShare();
}

/**
 * Check if current device has a device share
 */
export function hasCurrentDeviceShare(): boolean {
  return getDeviceShare() !== null;
}
