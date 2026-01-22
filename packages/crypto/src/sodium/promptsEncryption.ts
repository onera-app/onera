/**
 * Prompts Encryption Module
 * Handles encryption of prompt name, description, and content using master key
 */

import { encryptString, decryptString } from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';

/**
 * Encrypted prompt name data for storage
 */
export interface EncryptedPromptNameData {
  encryptedName: string;
  nameNonce: string;
}

/**
 * Encrypted prompt description data for storage
 */
export interface EncryptedPromptDescriptionData {
  encryptedDescription: string;
  descriptionNonce: string;
}

/**
 * Encrypted prompt content data for storage
 */
export interface EncryptedPromptContentData {
  encryptedContent: string;
  contentNonce: string;
}

/**
 * Full encrypted prompt data for storage
 */
export interface EncryptedPromptData {
  encryptedName: string;
  nameNonce: string;
  encryptedDescription?: string;
  descriptionNonce?: string;
  encryptedContent: string;
  contentNonce: string;
}

/**
 * Encrypt prompt name
 */
export function encryptPromptName(name: string): EncryptedPromptNameData {
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
 * Decrypt prompt name
 */
export function decryptPromptName(encryptedName: string, nameNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedName, nonce: nameNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt prompt name:', error);
    return 'Encrypted Prompt';
  }
}

/**
 * Encrypt prompt description
 */
export function encryptPromptDescription(description: string): EncryptedPromptDescriptionData {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const masterKey = getMasterKey();
  const encrypted = encryptString(description, masterKey);

  return {
    encryptedDescription: encrypted.ciphertext,
    descriptionNonce: encrypted.nonce
  };
}

/**
 * Decrypt prompt description
 */
export function decryptPromptDescription(encryptedDescription: string, descriptionNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedDescription, nonce: descriptionNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt prompt description:', error);
    return '';
  }
}

/**
 * Encrypt prompt content
 */
export function encryptPromptContent(content: string): EncryptedPromptContentData {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  const masterKey = getMasterKey();
  const encrypted = encryptString(content, masterKey);

  return {
    encryptedContent: encrypted.ciphertext,
    contentNonce: encrypted.nonce
  };
}

/**
 * Decrypt prompt content
 */
export function decryptPromptContent(encryptedContent: string, contentNonce: string): string {
  if (!isUnlocked()) {
    throw new Error('E2EE not unlocked');
  }

  try {
    const masterKey = getMasterKey();
    return decryptString({ ciphertext: encryptedContent, nonce: contentNonce }, masterKey);
  } catch (error) {
    console.error('Failed to decrypt prompt content:', error);
    return '';
  }
}

/**
 * Encrypt all prompt fields at once
 */
export function encryptPrompt(
  name: string,
  content: string,
  description?: string
): EncryptedPromptData {
  const nameData = encryptPromptName(name);
  const contentData = encryptPromptContent(content);

  const result: EncryptedPromptData = {
    ...nameData,
    ...contentData
  };

  if (description) {
    const descriptionData = encryptPromptDescription(description);
    result.encryptedDescription = descriptionData.encryptedDescription;
    result.descriptionNonce = descriptionData.descriptionNonce;
  }

  return result;
}
