/**
 * WebAuthn Credentials Encryption Module
 * Handles encryption of WebAuthn credential metadata (name) using master key
 */

import { encryptString, decryptString } from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';

/**
 * Encrypted WebAuthn credential name data for storage
 */
export interface EncryptedWebauthnNameData {
  encryptedName: string;
  nameNonce: string;
}

/**
 * Encrypt WebAuthn credential name
 */
export function encryptWebauthnCredentialName(name: string): EncryptedWebauthnNameData {
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
 * Decrypt WebAuthn credential name
 */
export function decryptWebauthnCredentialName(encryptedName: string, nameNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedName, nonce: nameNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt WebAuthn credential name:', error);
    return 'Encrypted Passkey';
  }
}
