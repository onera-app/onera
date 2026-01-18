/**
 * Key Setup Module
 * Orchestrates the key generation and sharding process for new users
 * and handles key reconstruction for returning users
 *
 * SECURITY MODEL (Privy-style):
 * - Auth share: Stored plaintext on server, protected by Clerk authentication
 * - Device share: Encrypted in localStorage with server-provided entropy
 * - Recovery share: Encrypted with recovery key (from mnemonic)
 *
 * Unlock requires authenticated Clerk session to retrieve auth share from server.
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
  type KeyShares,
} from './shareManager';
import { storeDeviceShare, getOrCreateDeviceId } from './deviceShare';
import { serializeAuthShare } from './authShare';
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

  // Auth share (plaintext, base64)
  authShare: string;

  // Public key (base64)
  publicKey: string;

  // Pre-computed storable keys (ready for database)
  storableKeys: StorableKeyShares;
}

/**
 * Data to store in the database for key shares (Privy-style)
 */
export interface StorableKeyShares {
  // Auth share (plaintext, protected by Clerk authentication)
  authShare: string;

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
}

/**
 * Generate all keys and shares for a new user registration
 *
 * @param deviceSecret - Server-generated 32-byte random secret for device share encryption
 * @returns Key bundle with all generated keys and encrypted shares (ready to store)
 */
export async function setupUserKeysWithSharding(
  deviceSecret: string
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

  // 8. Serialize auth share (plaintext - security from Clerk auth)
  const authShare = serializeAuthShare(shares.authShare);

  // 9. Store device share locally with server entropy
  const deviceId = getOrCreateDeviceId();
  storeDeviceShare(shares.deviceShare, deviceSecret, deviceId);

  // 10. Compute storable keys BEFORE zeroing recovery key
  // Encrypt master key with recovery key (for recovery phrase display)
  const masterKeyRecovery = encryptKey(masterKey, recoveryKey);

  // Encrypt recovery key with master key (for viewing recovery phrase later)
  const encryptedRecoveryKeyData = encryptKey(recoveryKey, masterKey);

  const publicKeyBase64 = toBase64(keyPair.publicKey);

  const storableKeys: StorableKeyShares = {
    authShare,
    ...serializeStoredRecoveryShare(encryptedRecoveryShare),
    publicKey: publicKeyBase64,
    encryptedPrivateKey: encryptedPrivateKey.ciphertext,
    privateKeyNonce: encryptedPrivateKey.nonce,
    masterKeyRecovery: masterKeyRecovery.ciphertext,
    masterKeyRecoveryNonce: masterKeyRecovery.nonce,
    encryptedRecoveryKey: encryptedRecoveryKeyData.ciphertext,
    recoveryKeyNonce: encryptedRecoveryKeyData.nonce,
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
    authShare,
    publicKey: publicKeyBase64,
    storableKeys,
  };
}

/**
 * @deprecated Use bundle.storableKeys directly from setupUserKeysWithSharding instead
 */
export function keyBundleToStorable(
  bundle: ShardedKeyBundle,
  recoveryKey: Uint8Array,
  masterKey: Uint8Array,
  _clerkUserId: string
): StorableKeyShares {
  // Encrypt master key with recovery key (for recovery phrase display)
  const masterKeyRecovery = encryptKey(masterKey, recoveryKey);

  // Encrypt recovery key with master key (for viewing recovery phrase later)
  const encryptedRecoveryKey = encryptKey(recoveryKey, masterKey);

  return {
    authShare: bundle.authShare,
    ...serializeStoredRecoveryShare(bundle.encryptedRecoveryShare),
    publicKey: bundle.publicKey,
    encryptedPrivateKey: bundle.encryptedPrivateKey.ciphertext,
    privateKeyNonce: bundle.encryptedPrivateKey.nonce,
    masterKeyRecovery: masterKeyRecovery.ciphertext,
    masterKeyRecoveryNonce: masterKeyRecovery.nonce,
    encryptedRecoveryKey: encryptedRecoveryKey.ciphertext,
    recoveryKeyNonce: encryptedRecoveryKey.nonce,
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
 * Unlock user keys using all 3 shares
 * This is for full share reconstruction when all shares are available
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
 * Unlock using auth share from server (Privy-style)
 * This is the primary unlock flow after OAuth/login
 *
 * @param authShareBase64 - Auth share from server (plaintext, base64 encoded)
 * @param deviceSecret - Server-provided device secret for decrypting device share
 * @param storedKeys - Keys from database
 */
export function unlockWithAuthShare(
  _authShareBase64: string,
  _deviceSecret: string,
  _storedKeys: {
    encryptedRecoveryShare: string;
    recoveryShareNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys {
  // NOTE: This function is not fully implemented because the XOR-based 3-share system
  // requires ALL 3 shares to reconstruct the master key.
  // For normal login, use unlockWithRecoveryPhrase which uses masterKeyRecovery.
  throw new Error(
    'unlockWithAuthShare requires recovery share. ' +
    'For normal login, use unlockWithRecoveryPhrase which uses masterKeyRecovery. ' +
    'The XOR-based 3-share system requires ALL 3 shares to reconstruct.'
  );
}

/**
 * Unlock using recovery phrase (mnemonic)
 * This decrypts the master key directly from masterKeyRecovery field
 *
 * @param mnemonic - 12 or 24 word recovery phrase
 * @param storedKeys - Keys from database
 */
export function unlockWithRecoveryPhrase(
  mnemonic: string,
  storedKeys: {
    masterKeyRecovery: string;
    masterKeyRecoveryNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys {
  // Import here to avoid circular dependency
  const { mnemonicToRecoveryKey } = require('../sodium/recoveryKey');

  // Derive recovery key from mnemonic
  const recoveryKey = mnemonicToRecoveryKey(mnemonic);

  try {
    // Decrypt master key directly from masterKeyRecovery
    const masterKey = decryptKey(
      {
        ciphertext: storedKeys.masterKeyRecovery,
        nonce: storedKeys.masterKeyRecoveryNonce,
      },
      recoveryKey
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
    secureZero(recoveryKey);
  }
}

/**
 * @deprecated Use unlockWithRecoveryPhrase instead
 * Login key derivation was a vulnerability - master key encrypted with user-ID-derived key
 */
export function unlockWithLoginKey(
  _clerkUserId: string,
  _storedKeys: {
    encryptedMasterKeyForLogin?: string;
    masterKeyForLoginNonce?: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys {
  throw new Error(
    'unlockWithLoginKey is deprecated and insecure. ' +
    'The login key derivation from user ID alone was a vulnerability. ' +
    'Use unlockWithRecoveryPhrase with the user\'s mnemonic recovery phrase instead. ' +
    'For OAuth login, the user should enter their recovery phrase on first login from a new device.'
  );
}

/**
 * @deprecated Use unlockWithRecoveryPhrase for recovery scenarios
 */
export function unlockWithRecoveryAndReshard(
  _mnemonic: string,
  _authShare: Uint8Array,
  _storedKeys: {
    encryptedRecoveryShare: string;
    recoveryShareNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  }
): DecryptedKeys & { newDeviceShare: Uint8Array; newRecoveryShare: Uint8Array } {
  throw new Error(
    'unlockWithRecoveryAndReshard is deprecated. ' +
    'Use unlockWithRecoveryPhrase for recovery, then reshardForNewDevice separately.'
  );
}

/**
 * Get the device share for the current device
 * @deprecated Use getDeviceShare(deviceSecret) instead - requires server secret
 */
export function getCurrentDeviceShare(): Uint8Array | null {
  throw new Error(
    'getCurrentDeviceShare is deprecated. ' +
    'Device share decryption now requires server-provided deviceSecret. ' +
    'Use getDeviceShare(deviceSecret) instead.'
  );
}

/**
 * Check if current device has a device share stored
 */
export function hasCurrentDeviceShare(): boolean {
  const { hasDeviceShare } = require('./deviceShare');
  return hasDeviceShare();
}
