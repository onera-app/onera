/**
 * Notes Encryption Module
 * Handles encryption of note titles and content using master key
 */

import { encryptString, decryptString } from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';

/**
 * Encrypted note data for storage
 */
export interface EncryptedNoteData {
	encryptedTitle: string;
	titleNonce: string;
	encryptedContent: string;
	contentNonce: string;
}

/**
 * Encrypt note title
 */
export function encryptNoteTitle(title: string): { encryptedTitle: string; titleNonce: string } {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptString(title, masterKey);

	return {
		encryptedTitle: encrypted.ciphertext,
		titleNonce: encrypted.nonce
	};
}

/**
 * Decrypt note title
 */
export function decryptNoteTitle(encryptedTitle: string, titleNonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encryptedTitle, nonce: titleNonce }, masterKey);
	} catch (error) {
		console.error('Failed to decrypt note title:', error);
		return 'Untitled';
	}
}

/**
 * Encrypt note content
 */
export function encryptNoteContent(content: string): { encryptedContent: string; contentNonce: string } {
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
 * Decrypt note content
 */
export function decryptNoteContent(encryptedContent: string, contentNonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encryptedContent, nonce: contentNonce }, masterKey);
	} catch (error) {
		console.error('Failed to decrypt note content:', error);
		return '';
	}
}

/**
 * Encrypt a complete note (title + content)
 */
export function encryptNote(title: string, content: string): EncryptedNoteData {
	const encryptedTitle = encryptNoteTitle(title);
	const encryptedContent = encryptNoteContent(content);

	return {
		...encryptedTitle,
		...encryptedContent
	};
}

/**
 * Decrypt a complete note (title + content)
 */
export function decryptNote(
	encryptedTitle: string,
	titleNonce: string,
	encryptedContent: string,
	contentNonce: string
): { title: string; content: string } {
	return {
		title: decryptNoteTitle(encryptedTitle, titleNonce),
		content: decryptNoteContent(encryptedContent, contentNonce)
	};
}
