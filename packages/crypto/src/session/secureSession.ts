/**
 * Secure Session Module
 * Uses Web Crypto API for non-extractable session keys
 *
 * SECURITY BENEFITS:
 * 1. Session key is NON-EXTRACTABLE - cannot be read by JavaScript (XSS protection)
 * 2. Keys stored in IndexedDB as CryptoKey objects (not base64 strings)
 * 3. Even if an attacker gets code execution, they cannot export the session key
 * 4. Master key is encrypted with the non-extractable session key
 *
 * The session key is generated using Web Crypto and marked as non-extractable.
 * This means crypto.subtle.exportKey() will throw an error if called on it.
 */

import {
  storeSessionData,
  getSessionData,
  deleteSessionData,
  clearAllSessionData,
  type SecureSessionData,
} from './indexedDb';

const SESSION_ID = 'current';
const DEFAULT_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if Web Crypto is available
 */
function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.generateKey === 'function'
  );
}

/**
 * Generate a non-extractable AES-GCM session key
 * The key CANNOT be exported via crypto.subtle.exportKey()
 */
async function generateSessionKey(): Promise<CryptoKey> {
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API not available');
  }

  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // NOT extractable - this is the key security feature
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with the session key
 */
async function encryptWithSessionKey(
  sessionKey: CryptoKey,
  data: Uint8Array
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    sessionKey,
    data as BufferSource
  );

  return { ciphertext, iv };
}

/**
 * Decrypt data with the session key
 */
async function decryptWithSessionKey(
  sessionKey: CryptoKey,
  ciphertext: ArrayBuffer,
  iv: Uint8Array
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    sessionKey,
    ciphertext
  );

  return new Uint8Array(decrypted);
}

/**
 * Create a secure session with non-extractable keys
 *
 * @param masterKey - The master key to protect
 * @param privateKey - The private key to protect
 * @param publicKey - The public key (not encrypted, just stored)
 * @param durationMs - Session duration in milliseconds
 */
export async function createSecureSession(
  masterKey: Uint8Array,
  privateKey: Uint8Array,
  publicKey: Uint8Array,
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): Promise<void> {
  // Generate non-extractable session key
  const sessionKey = await generateSessionKey();

  // Encrypt master key and private key with session key
  const { ciphertext: encryptedMasterKey, iv: masterKeyIv } =
    await encryptWithSessionKey(sessionKey, masterKey);

  const { ciphertext: encryptedPrivateKey, iv: privateKeyIv } =
    await encryptWithSessionKey(sessionKey, privateKey);

  const now = Date.now();

  // Store in IndexedDB
  const sessionData: SecureSessionData = {
    id: SESSION_ID,
    sessionKey, // Non-extractable CryptoKey stored directly
    encryptedMasterKey,
    masterKeyIv,
    encryptedPrivateKey,
    privateKeyIv,
    publicKey: new Uint8Array(publicKey), // Copy to avoid external mutation
    createdAt: now,
    expiresAt: now + durationMs,
  };

  await storeSessionData(sessionData);
}

/**
 * Restore keys from a secure session
 *
 * @returns Decrypted keys or null if session doesn't exist/expired
 */
export async function restoreSecureSession(): Promise<{
  masterKey: Uint8Array;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null> {
  const sessionData = await getSessionData(SESSION_ID);

  if (!sessionData) {
    return null;
  }

  // Check expiration
  if (Date.now() > sessionData.expiresAt) {
    await deleteSessionData(SESSION_ID);
    return null;
  }

  try {
    // Decrypt using the non-extractable session key
    const masterKey = await decryptWithSessionKey(
      sessionData.sessionKey,
      sessionData.encryptedMasterKey,
      sessionData.masterKeyIv
    );

    const privateKey = await decryptWithSessionKey(
      sessionData.sessionKey,
      sessionData.encryptedPrivateKey,
      sessionData.privateKeyIv
    );

    return {
      masterKey,
      privateKey,
      publicKey: new Uint8Array(sessionData.publicKey),
    };
  } catch (error) {
    // Session key may be invalid (e.g., browser cleared crypto state)
    console.error('Failed to restore secure session:', error);
    await deleteSessionData(SESSION_ID);
    return null;
  }
}

/**
 * Extend the session expiration time
 *
 * @param durationMs - New duration from now
 */
export async function extendSecureSession(
  durationMs: number = DEFAULT_SESSION_DURATION_MS
): Promise<boolean> {
  const sessionData = await getSessionData(SESSION_ID);

  if (!sessionData) {
    return false;
  }

  // Update expiration
  sessionData.expiresAt = Date.now() + durationMs;
  await storeSessionData(sessionData);

  return true;
}

/**
 * Check if a secure session exists and is valid
 */
export async function hasValidSecureSession(): Promise<boolean> {
  const sessionData = await getSessionData(SESSION_ID);

  if (!sessionData) {
    return false;
  }

  // Check expiration
  if (Date.now() > sessionData.expiresAt) {
    await deleteSessionData(SESSION_ID);
    return false;
  }

  return true;
}

/**
 * Clear the current secure session
 */
export async function clearSecureSession(): Promise<void> {
  await deleteSessionData(SESSION_ID);
}

/**
 * Clear all secure sessions (full logout)
 */
export async function clearAllSecureSessions(): Promise<void> {
  await clearAllSessionData();
}

/**
 * Get session info without exposing keys
 */
export async function getSecureSessionInfo(): Promise<{
  createdAt: number;
  expiresAt: number;
  isExpired: boolean;
  remainingMs: number;
} | null> {
  const sessionData = await getSessionData(SESSION_ID);

  if (!sessionData) {
    return null;
  }

  const now = Date.now();
  const isExpired = now > sessionData.expiresAt;
  const remainingMs = Math.max(0, sessionData.expiresAt - now);

  return {
    createdAt: sessionData.createdAt,
    expiresAt: sessionData.expiresAt,
    isExpired,
    remainingMs,
  };
}

/**
 * Verify that the session key is truly non-extractable
 * This is for testing/debugging purposes
 */
export async function verifySessionKeyNonExtractable(): Promise<boolean> {
  const sessionData = await getSessionData(SESSION_ID);

  if (!sessionData) {
    return false;
  }

  try {
    // This should throw an error if the key is non-extractable
    await crypto.subtle.exportKey('raw', sessionData.sessionKey);
    // If we get here, the key was extractable (bad!)
    console.warn('WARNING: Session key is extractable! Security vulnerability.');
    return false;
  } catch (error) {
    // Expected error - key is properly non-extractable
    return true;
  }
}
