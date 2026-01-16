/**
 * Device Share Storage Module
 * Manages the device share stored in localStorage
 *
 * The device share is encrypted before storage using a device-specific key
 * derived from the device fingerprint.
 */

import { secureZero, type EncryptedData } from '../sodium/utils';
import { encryptShare, decryptShare, deriveDeviceShareKey } from './shareManager';

const STORAGE_KEY_PREFIX = 'onera_device_share_';
const DEVICE_ID_KEY = 'onera_device_id';

/**
 * Stored device share format
 */
interface StoredDeviceShare {
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
 * Generate a browser fingerprint for additional entropy
 * This is mixed with the device ID for key derivation
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
 * Create a full device identifier by combining device ID with fingerprint
 */
function getFullDeviceIdentifier(deviceId: string): string {
  return `${deviceId}:${getBrowserFingerprint()}`;
}

/**
 * Store the device share encrypted in localStorage
 */
export function storeDeviceShare(
  deviceShare: Uint8Array,
  deviceId?: string
): void {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage not available');
  }

  const id = deviceId || getOrCreateDeviceId();
  const fullId = getFullDeviceIdentifier(id);

  // Derive encryption key from device identifier
  const encryptionKey = deriveDeviceShareKey(fullId);

  // Encrypt the share
  const encrypted = encryptShare(deviceShare, encryptionKey);

  // Securely clear the encryption key
  secureZero(encryptionKey);

  // Store in localStorage
  const stored: StoredDeviceShare = {
    version: 1,
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
 */
export function getDeviceShare(deviceId?: string): Uint8Array | null {
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
    const data: StoredDeviceShare = JSON.parse(stored);

    if (data.version !== 1) {
      console.warn('Unknown device share version:', data.version);
      return null;
    }

    const fullId = getFullDeviceIdentifier(id);
    const encryptionKey = deriveDeviceShareKey(fullId);

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
): { deviceId: string; createdAt: number; lastUsedAt: number } | null {
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
    const data: StoredDeviceShare = JSON.parse(stored);
    return {
      deviceId: data.deviceId,
      createdAt: data.createdAt,
      lastUsedAt: data.lastUsedAt,
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
