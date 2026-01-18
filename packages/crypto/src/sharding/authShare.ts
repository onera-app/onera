/**
 * Auth Share Module
 * Manages the auth share for Privy-style server-protected E2EE
 *
 * SECURITY MODEL:
 * The auth share is stored as PLAINTEXT on the server.
 * Security comes from Clerk authentication, NOT encryption.
 * The server only releases the auth share to authenticated Clerk sessions.
 *
 * This follows Privy's embedded wallet model where key shares are
 * protected by authentication rather than encryption.
 */

import { toBase64, fromBase64 } from '../sodium/utils';

/**
 * Serialize auth share for transmission to server
 * No encryption - security is provided by Clerk authentication
 */
export function serializeAuthShare(authShare: Uint8Array): string {
  return toBase64(authShare);
}

/**
 * Deserialize auth share from server response
 */
export function deserializeAuthShare(serialized: string): Uint8Array {
  return fromBase64(serialized);
}

/**
 * Legacy interface for backwards compatibility during migration
 * @deprecated Use serializeAuthShare/deserializeAuthShare instead
 */
export interface StoredAuthShare {
  version: 1;
  encrypted: string;
  nonce: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * @deprecated Legacy function - auth share encryption removed for Privy-style security
 * Just serializes the share for storage (no actual encryption)
 */
export function encryptAuthShareForStorage(
  authShare: Uint8Array,
  _clerkUserId: string
): StoredAuthShare {
  // No longer encrypting - just serialize for backwards compatibility
  return {
    version: 1,
    encrypted: toBase64(authShare),
    nonce: '', // No longer needed
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * @deprecated Legacy function - auth share encryption removed for Privy-style security
 * Just deserializes the share from storage
 */
export function decryptAuthShareFromStorage(
  stored: StoredAuthShare,
  _clerkUserId: string
): Uint8Array {
  return fromBase64(stored.encrypted);
}

/**
 * @deprecated Legacy validation - kept for backwards compatibility
 */
export function isValidStoredAuthShare(data: unknown): data is StoredAuthShare {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    obj.version === 1 &&
    typeof obj.encrypted === 'string'
  );
}

/**
 * @deprecated Legacy function - auth shares are now stored on server only
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
 * @deprecated Legacy function - auth shares are now stored on server only
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
 * @deprecated Legacy function - auth shares are now stored on server only
 */
export function removeAuthShareFromMetadata(
  existingMetadata: Record<string, unknown>
): Record<string, unknown> {
  const { authShare, ...rest } = existingMetadata;
  return rest;
}

/**
 * @deprecated Legacy function - auth shares are now stored on server only
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
