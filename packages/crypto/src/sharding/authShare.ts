/**
 * Auth Share Module
 * Manages the auth share stored in Clerk user metadata
 *
 * The auth share is encrypted using a key derived from the Clerk user ID
 * and stored in Clerk's unsafeMetadata field.
 */

import { secureZero, type EncryptedData } from '../sodium/utils';
import { encryptShare, decryptShare, deriveAuthShareKey } from './shareManager';

/**
 * Stored auth share format in Clerk metadata
 */
export interface StoredAuthShare {
  version: 1;
  encrypted: string;
  nonce: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Encrypt the auth share for storage in Clerk
 */
export function encryptAuthShareForStorage(
  authShare: Uint8Array,
  clerkUserId: string
): StoredAuthShare {
  // Derive encryption key from Clerk user ID
  const encryptionKey = deriveAuthShareKey(clerkUserId);

  // Encrypt the share
  const encrypted = encryptShare(authShare, encryptionKey);

  // Securely clear the encryption key
  secureZero(encryptionKey);

  return {
    version: 1,
    encrypted: encrypted.ciphertext,
    nonce: encrypted.nonce,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Decrypt the auth share from Clerk metadata
 */
export function decryptAuthShareFromStorage(
  stored: StoredAuthShare,
  clerkUserId: string
): Uint8Array {
  if (stored.version !== 1) {
    throw new Error(`Unknown auth share version: ${stored.version}`);
  }

  // Derive encryption key from Clerk user ID
  const encryptionKey = deriveAuthShareKey(clerkUserId);

  const encrypted: EncryptedData = {
    ciphertext: stored.encrypted,
    nonce: stored.nonce,
  };

  try {
    const authShare = decryptShare(encrypted, encryptionKey);
    return authShare;
  } finally {
    secureZero(encryptionKey);
  }
}

/**
 * Validate that stored auth share data is well-formed
 */
export function isValidStoredAuthShare(data: unknown): data is StoredAuthShare {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    obj.version === 1 &&
    typeof obj.encrypted === 'string' &&
    typeof obj.nonce === 'string' &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Extract auth share from Clerk user metadata
 * Returns null if not found or invalid
 */
export function extractAuthShareFromMetadata(
  unsafeMetadata: Record<string, unknown> | null | undefined
): StoredAuthShare | null {
  if (!unsafeMetadata) {
    return null;
  }

  const authShare = unsafeMetadata.authShare;

  if (isValidStoredAuthShare(authShare)) {
    return authShare;
  }

  return null;
}

/**
 * Create metadata object with auth share for updating Clerk
 */
export function createAuthShareMetadata(
  authShare: Uint8Array,
  clerkUserId: string,
  existingMetadata?: Record<string, unknown>
): Record<string, unknown> {
  const storedAuthShare = encryptAuthShareForStorage(authShare, clerkUserId);

  return {
    ...existingMetadata,
    authShare: storedAuthShare,
  };
}

/**
 * Remove auth share from metadata (for account deletion)
 */
export function removeAuthShareFromMetadata(
  existingMetadata: Record<string, unknown>
): Record<string, unknown> {
  const { authShare, ...rest } = existingMetadata;
  return rest;
}

/**
 * Update the auth share in metadata (for share rotation)
 */
export function updateAuthShareInMetadata(
  existingMetadata: Record<string, unknown>,
  newAuthShare: Uint8Array,
  clerkUserId: string
): Record<string, unknown> {
  const existingAuthShare = extractAuthShareFromMetadata(existingMetadata);

  const storedAuthShare = encryptAuthShareForStorage(newAuthShare, clerkUserId);

  // Preserve creation time if updating
  if (existingAuthShare) {
    storedAuthShare.createdAt = existingAuthShare.createdAt;
  }

  return {
    ...existingMetadata,
    authShare: storedAuthShare,
  };
}
