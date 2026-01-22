/**
 * Devices Encryption Module
 * Handles encryption of device names using master key
 */

import { encryptString, decryptString } from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';

/**
 * Encrypted device name data for storage
 */
export interface EncryptedDeviceNameData {
  encryptedDeviceName: string;
  deviceNameNonce: string;
}

/**
 * Encrypt device name
 */
export function encryptDeviceName(name: string): EncryptedDeviceNameData {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const masterKey = getMasterKey();
  const encrypted = encryptString(name, masterKey);

  return {
    encryptedDeviceName: encrypted.ciphertext,
    deviceNameNonce: encrypted.nonce
  };
}

/**
 * Decrypt device name
 */
export function decryptDeviceName(encryptedDeviceName: string, deviceNameNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedDeviceName, nonce: deviceNameNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt device name:', error);
    return 'Encrypted Device';
  }
}
