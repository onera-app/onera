/**
 * Key Share Manager Module
 * Implements XOR-based key sharding for E2EE
 *
 * IMPORTANT: This is NOT Shamir Secret Sharing.
 * This uses XOR-based splitting which requires ALL 3 shares to reconstruct.
 *
 * Key sharding approach:
 * - Master key M is split: A, B, C where C = M XOR A XOR B
 * - Reconstruction: M = A XOR B XOR C (requires all 3 shares)
 *
 * Shares:
 * - Device share (A): Stored encrypted in localStorage with server-provided entropy
 * - Auth share (B): Stored plaintext on server, protected by Clerk authentication
 * - Recovery share (C): Stored encrypted with recovery key derived from mnemonic
 *
 * For "2-of-3" style recovery, the masterKeyRecovery field is used instead
 * (master key encrypted directly with recovery key).
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
 * IMPORTANT: This requires ALL 3 shares to reconstruct the master key.
 * This is NOT 2-of-3 Shamir Secret Sharing.
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
 * Reconstruct master key from all 3 shares
 *
 * IMPORTANT: XOR-based 3-share system requires ALL 3 shares.
 * For recovery scenarios without device share, use masterKeyRecovery
 * (master key encrypted with recovery key) instead.
 */
export function reconstructFromShares(shares: Uint8Array[]): Uint8Array {
  if (shares.length !== 3) {
    throw new Error('XOR-based reconstruction requires exactly 3 shares. For recovery without device share, use masterKeyRecovery field.');
  }

  // Validate all shares are correct length
  for (const share of shares) {
    if (share.length !== MASTER_KEY_LENGTH) {
      throw new Error(`Each share must be ${MASTER_KEY_LENGTH} bytes`);
    }
  }

  // M = A XOR B XOR C
  const result = new Uint8Array(MASTER_KEY_LENGTH);
  for (let i = 0; i < MASTER_KEY_LENGTH; i++) {
    result[i] = shares[0][i] ^ shares[1][i] ^ shares[2][i];
  }
  return result;
}

/**
 * Reconstruct master key from device + auth + recovery shares
 * This is the unlock flow when all 3 shares are available
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
 * Used for encrypting device share (with device-derived key) and recovery share (with recovery key)
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
 * Uses BLAKE2b for initial hashing, then crypto_kdf for proper key derivation
 *
 * @param identifier - The input identifier (e.g., device ID + fingerprint + secret)
 * @param context - Context string for domain separation (max 16 chars used)
 * @param salt - Optional additional salt for extra entropy
 */
export function deriveShareEncryptionKey(
  identifier: string,
  context: string,
  salt?: Uint8Array
): Uint8Array {
  const sodium = getSodium();
  const identifierBytes = new TextEncoder().encode(identifier);

  // Use 16-byte context for KDF (padded or truncated as needed)
  // libsodium crypto_kdf requires exactly 16-byte context
  const kdfContext = context.padEnd(16, '\0').slice(0, 16);

  // Derive master key material from identifier (and optional salt)
  // This combines all entropy sources into a uniform 32-byte key
  const masterKey = salt
    ? sodium.crypto_generichash(MASTER_KEY_LENGTH, new Uint8Array([...salt, ...identifierBytes]))
    : sodium.crypto_generichash(MASTER_KEY_LENGTH, identifierBytes);

  // Use proper KDF to derive the final key with context separation
  const derivedKey = sodium.crypto_kdf_derive_from_key(
    MASTER_KEY_LENGTH,
    1, // subkey_id
    kdfContext,
    masterKey
  );

  // Zero the intermediate master key
  secureZero(masterKey);

  return derivedKey;
}

/**
 * @deprecated Auth share is no longer encrypted - security comes from Clerk authentication
 * Kept for backwards compatibility during migration
 */
export function deriveAuthShareKey(clerkUserId: string): Uint8Array {
  return deriveShareEncryptionKey(clerkUserId, 'onera.authshare.v1');
}

/**
 * Derive device share encryption key from device fingerprint and server-provided secret
 *
 * @param deviceId - Browser-generated UUID
 * @param fingerprint - Browser fingerprint components
 * @param deviceSecret - Server-generated 32-byte random secret (base64)
 */
export function deriveDeviceShareKey(
  deviceId: string,
  fingerprint?: string,
  deviceSecret?: string
): Uint8Array {
  // Combine all entropy sources
  const components = [deviceId];
  if (fingerprint) {
    components.push(fingerprint);
  }
  if (deviceSecret) {
    components.push(deviceSecret);
  }

  const identifier = components.join(':');
  return deriveShareEncryptionKey(identifier, 'onera.deviceshare.v2');
}

/**
 * @deprecated Login key derivation removed - this was a vulnerability
 *
 * Previously, the master key was encrypted with a key derived solely from
 * the Clerk user ID. This allowed anyone with database access to derive
 * the encryption key and decrypt user data.
 *
 * The new Privy-style model protects auth shares via Clerk authentication,
 * not encryption. Use unlockWithAuthShare instead.
 */
export function deriveLoginEncryptionKey(_clerkUserId: string): Uint8Array {
  throw new Error(
    'deriveLoginEncryptionKey is deprecated and insecure. ' +
    'Use Privy-style server-protected auth shares instead. ' +
    'The auth share is released only to authenticated Clerk sessions.'
  );
}
