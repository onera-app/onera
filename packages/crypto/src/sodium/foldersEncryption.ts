/**
 * Folders Encryption Module
 * Handles encryption of folder names using master key
 */

import { encryptString, decryptString } from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';

/**
 * Encrypted folder name data for storage
 */
export interface EncryptedFolderNameData {
  encryptedName: string;
  nameNonce: string;
}

/**
 * Encrypt folder name
 */
export function encryptFolderName(name: string): EncryptedFolderNameData {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const masterKey = getMasterKey();
  const encrypted = encryptString(name, masterKey);

  return {
    encryptedName: encrypted.ciphertext,
    nameNonce: encrypted.nonce
  };
}

/**
 * Decrypt folder name
 */
export function decryptFolderName(encryptedName: string, nameNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedName, nonce: nameNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt folder name:', error);
    return 'Encrypted Folder';
  }
}
