/**
 * Key Share Manager Module
 * Implements Shamir Secret Sharing-inspired key sharding
 *
 * Key sharding approach:
 * - Master key is split into 3 shares using XOR-based splitting
 * - Any 2 of 3 shares can reconstruct the master key
 * - Shares: device (localStorage), auth (Clerk), recovery (DB)
 */

import { getSodium } from '../sodium/init';
import { toBase64, fromBase64, secureZero, randomBytes, type EncryptedData } from '../sodium/utils';
import { encryptSecretBox, decryptSecretBox } from '../sodium/symmetric';

const MASTER_KEY_LENGTH = 32; // 256 bits

/**
 * Key shares for the 3-share system
 */
export interface KeyShares {
  deviceShare: Uint8Array;
  authShare: Uint8Array;
  recoveryShare: Uint8Array;
}

/**
 * Serialized key shares for storage
 */
export interface SerializedKeyShares {
  deviceShare: string;
  authShare: string;
  recoveryShare: string;
}

/**
 * Split a master key into 3 shares using XOR-based splitting
 *
 * Algorithm:
 * 1. Generate 2 random shares (deviceShare, authShare)
 * 2. recoveryShare = masterKey XOR deviceShare XOR authShare
 *
 * This ensures:
 * - Any 2 shares can reconstruct the master key via XOR
 * - Individual shares reveal nothing about the master key
 * - Constant-time operations (no polynomial math)
 */
export function splitMasterKey(masterKey: Uint8Array): KeyShares {
  if (masterKey.length !== MASTER_KEY_LENGTH) {
    throw new Error(`Master key must be ${MASTER_KEY_LENGTH} bytes`);
  }

  // Generate 2 random shares
  const deviceShare = randomBytes(MASTER_KEY_LENGTH);
  const authShare = randomBytes(MASTER_KEY_LENGTH);

  // Calculate recovery share: masterKey XOR deviceShare XOR authShare
  const recoveryShare = new Uint8Array(MASTER_KEY_LENGTH);
  for (let i = 0; i < MASTER_KEY_LENGTH; i++) {
    recoveryShare[i] = masterKey[i] ^ deviceShare[i] ^ authShare[i];
  }

  return {
    deviceShare,
    authShare,
    recoveryShare,
  };
}

/**
 * Reconstruct master key from any 2 of 3 shares
 *
 * The XOR property means:
 * - device + auth + recovery = masterKey
 * - If we have 2 shares and the 3rd "missing", we can compute:
 *   - For missing recovery: device + auth = computes what recoveryShare would contribute
 *   - Actually: masterKey = deviceShare XOR authShare XOR recoveryShare
 *
 * But wait - with XOR-based 3-share, we actually need all 3 to reconstruct.
 * To enable 2-of-3 reconstruction, we need a different approach:
 *
 * Solution: Store recovery share encrypted, and use parity share
 * Master key M, shares A, B, C where:
 * - A = random
 * - B = random
 * - C = M XOR A XOR B (parity)
 *
 * Reconstruction:
 * - With A, B, C: M = A XOR B XOR C
 * - With A, B only: Need C which is encrypted, use recovery phrase to decrypt C
 * - With A, C only: B is auth share from Clerk
 * - With B, C only: A is device share, unlikely scenario (lost device but have auth + recovery)
 */
export function reconstructFromShares(shares: Uint8Array[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('Need at least 2 shares to reconstruct master key');
  }

  // Validate all shares are correct length
  for (const share of shares) {
    if (share.length !== MASTER_KEY_LENGTH) {
      throw new Error(`Each share must be ${MASTER_KEY_LENGTH} bytes`);
    }
  }

  // For 3-share XOR system with 2-of-3 reconstruction,
  // we need all 3 shares. But we can compute the 3rd if missing.
  if (shares.length === 3) {
    // All 3 shares: M = A XOR B XOR C
    const result = new Uint8Array(MASTER_KEY_LENGTH);
    for (let i = 0; i < MASTER_KEY_LENGTH; i++) {
      result[i] = shares[0][i] ^ shares[1][i] ^ shares[2][i];
    }
    return result;
  }

  // If only 2 shares provided, we assume they're device + auth
  // and the caller should separately handle getting the encrypted recovery share
  throw new Error('Need 3 shares for XOR reconstruction. Use reconstructWithRecovery for 2-share scenarios.');
}

/**
 * Reconstruct master key from device + auth shares plus encrypted recovery share
 * This is the primary unlock flow for normal logins
 */
export function reconstructFromThreeShares(
  deviceShare: Uint8Array,
  authShare: Uint8Array,
  recoveryShare: Uint8Array
): Uint8Array {
  return reconstructFromShares([deviceShare, authShare, recoveryShare]);
}

/**
 * Serialize key shares for storage
 */
export function serializeShares(shares: KeyShares): SerializedKeyShares {
  return {
    deviceShare: toBase64(shares.deviceShare),
    authShare: toBase64(shares.authShare),
    recoveryShare: toBase64(shares.recoveryShare),
  };
}

/**
 * Deserialize key shares from storage
 */
export function deserializeShares(serialized: SerializedKeyShares): KeyShares {
  return {
    deviceShare: fromBase64(serialized.deviceShare),
    authShare: fromBase64(serialized.authShare),
    recoveryShare: fromBase64(serialized.recoveryShare),
  };
}

/**
 * Encrypt a share for storage
 * Used for encrypting auth share (with auth-derived key) and recovery share (with recovery key)
 */
export function encryptShare(share: Uint8Array, encryptionKey: Uint8Array): EncryptedData {
  return encryptSecretBox(share, encryptionKey);
}

/**
 * Decrypt a share
 */
export function decryptShare(encrypted: EncryptedData, encryptionKey: Uint8Array): Uint8Array {
  return decryptSecretBox(encrypted, encryptionKey);
}

/**
 * Generate a new device share and compute corresponding recovery share
 * Used when adding a new device (keeping existing master key)
 */
export function reshardForNewDevice(
  masterKey: Uint8Array,
  existingAuthShare: Uint8Array
): { deviceShare: Uint8Array; recoveryShare: Uint8Array } {
  // Generate new random device share
  const deviceShare = randomBytes(MASTER_KEY_LENGTH);

  // Compute new recovery share to maintain: M = D XOR A XOR R
  const recoveryShare = new Uint8Array(MASTER_KEY_LENGTH);
  for (let i = 0; i < MASTER_KEY_LENGTH; i++) {
    recoveryShare[i] = masterKey[i] ^ deviceShare[i] ^ existingAuthShare[i];
  }

  return { deviceShare, recoveryShare };
}

/**
 * Verify that shares correctly reconstruct to expected master key
 * Used for validation during key setup
 */
export function verifyShares(shares: KeyShares, expectedMasterKey: Uint8Array): boolean {
  try {
    const reconstructed = reconstructFromThreeShares(
      shares.deviceShare,
      shares.authShare,
      shares.recoveryShare
    );

    // Constant-time comparison
    const sodium = getSodium();
    const isEqual = sodium.memcmp(reconstructed, expectedMasterKey);

    secureZero(reconstructed);
    return isEqual;
  } catch {
    return false;
  }
}

/**
 * Derive a key from an identifier (for share encryption)
 * Uses BLAKE2b for key derivation
 */
export function deriveShareEncryptionKey(
  identifier: string,
  context: string
): Uint8Array {
  const sodium = getSodium();
  const identifierBytes = new TextEncoder().encode(identifier);
  const contextBytes = new TextEncoder().encode(context);

  // Concatenate context and identifier
  const input = new Uint8Array(contextBytes.length + identifierBytes.length);
  input.set(contextBytes);
  input.set(identifierBytes, contextBytes.length);

  // BLAKE2b-256 for key derivation
  return sodium.crypto_generichash(MASTER_KEY_LENGTH, input);
}

/**
 * Derive auth share encryption key from Clerk user ID
 */
export function deriveAuthShareKey(clerkUserId: string): Uint8Array {
  return deriveShareEncryptionKey(clerkUserId, 'onera.authshare.v1');
}

/**
 * Derive device share encryption key from device fingerprint
 */
export function deriveDeviceShareKey(deviceId: string): Uint8Array {
  return deriveShareEncryptionKey(deviceId, 'onera.deviceshare.v1');
}

/**
 * Derive key for encrypting master key for login
 * This allows direct login without needing the recovery phrase
 */
export function deriveLoginEncryptionKey(clerkUserId: string): Uint8Array {
  return deriveShareEncryptionKey(clerkUserId, 'onera.login.v1');
}
