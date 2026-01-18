/**
 * Device Share Storage Module
 * Manages the device share stored in localStorage
 *
 * SECURITY MODEL:
 * The device share is encrypted with a key derived from:
 * 1. Device ID (random UUID stored in localStorage)
 * 2. Browser fingerprint (screen, timezone, etc.)
 * 3. Device secret (server-generated random 32 bytes)
 *
 * The server-provided device secret prevents attackers with just
 * localStorage access from decrypting the device share.
 * They would also need to compromise the server to get the secret.
 */

import { secureZero, type EncryptedData } from '../sodium/utils';
import { encryptShare, decryptShare, deriveDeviceShareKey } from './shareManager';

const STORAGE_KEY_PREFIX = 'onera_device_share_';
const DEVICE_ID_KEY = 'onera_device_id';

/**
 * Stored device share format
 */
interface StoredDeviceShare {
  version: 2; // Bumped version for new security model
  encrypted: string;
  nonce: string;
  deviceId: string;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Legacy format (version 1) for migration
 */
interface LegacyStoredDeviceShare {
  version: 1;
  encrypted: string;
  nonce: string;
  deviceId: string;
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Generate a unique device ID if one doesn't exist
 * Uses crypto.randomUUID for uniqueness
 */
export function getOrCreateDeviceId(): string {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage not available');
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Get the current device ID without creating one
 */
export function getDeviceId(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(DEVICE_ID_KEY);
}

/**
 * Generate a browser fingerprint for additional entropy.
 * This is mixed with the device ID and server secret for key derivation.
 *
 * SECURITY NOTE: This fingerprint provides anti-tampering, NOT strong security.
 * The real security comes from the server-provided deviceSecret.
 * Fingerprint components may change on browser/OS/display updates.
 *
 * Components:
 * - userAgent: Browser/OS identifier (can change on browser updates)
 * - language: User's language setting
 * - timezone: User's timezone
 * - screen dimensions: May change with display configuration changes
 * - colorDepth: Display color depth
 *
 * If fingerprint changes, the user will need to re-register the device
 * or use an alternative unlock method (passkey, password, recovery phrase).
 */
function getBrowserFingerprint(): string {
  if (typeof navigator === 'undefined') {
    return 'server';
  }

  const components = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen?.width?.toString() || '',
    screen?.height?.toString() || '',
    screen?.colorDepth?.toString() || '',
  ];

  return components.join('|');
}

/**
 * Store the device share encrypted in localStorage
 *
 * @param deviceShare - The device share to store
 * @param deviceSecret - Server-generated 32-byte random secret (base64)
 * @param deviceId - Optional device ID (will be created if not provided)
 */
export function storeDeviceShare(
  deviceShare: Uint8Array,
  deviceSecret: string,
  deviceId?: string
): void {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage not available');
  }

  const id = deviceId || getOrCreateDeviceId();
  const fingerprint = getBrowserFingerprint();

  // Derive encryption key from device ID + fingerprint + server secret
  const encryptionKey = deriveDeviceShareKey(id, fingerprint, deviceSecret);

  // Encrypt the share
  const encrypted = encryptShare(deviceShare, encryptionKey);

  // Securely clear the encryption key
  secureZero(encryptionKey);

  // Store in localStorage
  const stored: StoredDeviceShare = {
    version: 2,
    encrypted: encrypted.ciphertext,
    nonce: encrypted.nonce,
    deviceId: id,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${id}`,
    JSON.stringify(stored)
  );
}

/**
 * Retrieve and decrypt the device share from localStorage
 *
 * @param deviceSecret - Server-generated secret required for decryption
 * @param deviceId - Optional device ID to retrieve (uses current device if not provided)
 */
export function getDeviceShare(
  deviceSecret: string,
  deviceId?: string
): Uint8Array | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const id = deviceId || getDeviceId();
  if (!id) {
    return null;
  }

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
  if (!stored) {
    return null;
  }

  try {
    const data = JSON.parse(stored) as StoredDeviceShare | LegacyStoredDeviceShare;

    // Check version - version 1 used old derivation without server secret
    if (data.version === 1) {
      // Cannot decrypt v1 shares without migration
      console.warn('Legacy device share format detected. Re-registration required.');
      return null;
    }

    // Handle unknown versions (defensive check for malformed data)
    if ((data as { version: number }).version !== 2) {
      console.warn('Unknown device share version:', (data as { version: number }).version);
      return null;
    }

    const fingerprint = getBrowserFingerprint();
    const encryptionKey = deriveDeviceShareKey(id, fingerprint, deviceSecret);

    const encrypted: EncryptedData = {
      ciphertext: data.encrypted,
      nonce: data.nonce,
    };

    const deviceShare = decryptShare(encrypted, encryptionKey);
    secureZero(encryptionKey);

    // Update last used timestamp
    data.lastUsedAt = Date.now();
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${id}`,
      JSON.stringify(data)
    );

    return deviceShare;
  } catch (error) {
    console.error('Failed to decrypt device share:', error);
    return null;
  }
}

/**
 * Check if a device share exists for the current device
 */
export function hasDeviceShare(deviceId?: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  const id = deviceId || getDeviceId();
  if (!id) {
    return false;
  }

  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`) !== null;
}

/**
 * Clear the device share from localStorage
 */
export function clearDeviceShare(deviceId?: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const id = deviceId || getDeviceId();
  if (id) {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
  }
}

/**
 * Clear all device shares and device ID
 * Used during full logout/account deletion
 */
export function clearAllDeviceData(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  // Clear device ID
  localStorage.removeItem(DEVICE_ID_KEY);

  // Clear all device shares
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/**
 * Get information about stored device shares
 */
export function getDeviceShareInfo(
  deviceId?: string
): { deviceId: string; createdAt: number; lastUsedAt: number; version: number } | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const id = deviceId || getDeviceId();
  if (!id) {
    return null;
  }

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
  if (!stored) {
    return null;
  }

  try {
    const data: StoredDeviceShare | LegacyStoredDeviceShare = JSON.parse(stored);
    return {
      deviceId: data.deviceId,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
      version: data.version,
    };
  } catch {
    return null;
  }
}

/**
 * List all device IDs that have stored shares
 * Useful for device management UI
 */
export function listStoredDeviceIds(): string[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const deviceIds: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_KEY_PREFIX)) {
      deviceIds.push(key.substring(STORAGE_KEY_PREFIX.length));
    }
  }

  return deviceIds;
}

/**
 * Check if device share needs migration (is version 1)
 */
export function needsDeviceShareMigration(deviceId?: string): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }

  const id = deviceId || getDeviceId();
  if (!id) {
    return false;
  }

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
  if (!stored) {
    return false;
  }

  try {
    const data = JSON.parse(stored);
    return data.version === 1;
  } catch {
    return false;
  }
}
