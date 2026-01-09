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
	encrypted_title: string;
	title_nonce: string;
	encrypted_content: string;
	content_nonce: string;
}

/**
 * Encrypt note title
 */
export function encryptNoteTitle(title: string): { encrypted_title: string; title_nonce: string } {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptString(title, masterKey);

	return {
		encrypted_title: encrypted.ciphertext,
		title_nonce: encrypted.nonce
	};
}

/**
 * Decrypt note title
 */
export function decryptNoteTitle(encrypted_title: string, title_nonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encrypted_title, nonce: title_nonce }, masterKey);
	} catch (error) {
		console.error('Failed to decrypt note title:', error);
		return 'Untitled';
	}
}

/**
 * Encrypt note content
 */
export function encryptNoteContent(content: string): { encrypted_content: string; content_nonce: string } {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptString(content, masterKey);

	return {
		encrypted_content: encrypted.ciphertext,
		content_nonce: encrypted.nonce
	};
}

/**
 * Decrypt note content
 */
export function decryptNoteContent(encrypted_content: string, content_nonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encrypted_content, nonce: content_nonce }, masterKey);
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
	encrypted_title: string,
	title_nonce: string,
	encrypted_content: string,
	content_nonce: string
): { title: string; content: string } {
	return {
		title: decryptNoteTitle(encrypted_title, title_nonce),
		content: decryptNoteContent(encrypted_content, content_nonce)
	};
}
