/**
 * Chat Sharing Module
 * Handles encrypting chat keys for sharing using public key encryption
 */

import {
	encryptKeyForRecipient,
	decryptSharedKey
} from './asymmetric';
import { fromBase64 } from './utils';
import { generateVerificationId } from './recoveryKey';
import { getPrivateKey, getPublicKey, isUnlocked } from './keyManager';
import { getChatKey } from './chatEncryption';
import { getNoteKey } from './notesEncryption';

/**
 * Encrypt a chat key for sharing with another user
 */
export function encryptChatKeyForRecipient(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	recipientPublicKey: string
): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	const recipientPubKey = fromBase64(recipientPublicKey);
	return encryptKeyForRecipient(chatKey, recipientPubKey);
}

/**
 * Encrypt a note key for sharing with another user
 */
export function encryptNoteKeyForRecipient(
	noteId: string,
	encryptedNoteKey: string,
	noteKeyNonce: string,
	recipientPublicKey: string
): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	if (!encryptedNoteKey || !noteKeyNonce) {
		throw new Error('Cannot share legacy notes. Please save the note first to upgrade its security.');
	}

	const noteKey = getNoteKey(noteId, encryptedNoteKey, noteKeyNonce);
	const recipientPubKey = fromBase64(recipientPublicKey);
	return encryptKeyForRecipient(noteKey, recipientPubKey);
}

/**
 * Decrypt a shared key (chat or note)
 */
export function decryptReceivedKey(encryptedKey: string): Uint8Array {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const publicKey = getPublicKey();
	const privateKey = getPrivateKey();

	return decryptSharedKey(encryptedKey, publicKey, privateKey);
}

/**
 * Decrypt a shared chat key (Legacy alias)
 */
export function decryptReceivedChatKey(encryptedChatKey: string): Uint8Array {
	return decryptReceivedKey(encryptedChatKey);
}

/**
 * Decrypt a shared note key
 */
export function decryptReceivedNoteKey(encryptedNoteKey: string): Uint8Array {
	return decryptReceivedKey(encryptedNoteKey);
}

/**
 * Get verification ID for a user's public key
 */
export function getVerificationIdForKey(publicKeyBase64: string): string {
	const publicKey = fromBase64(publicKeyBase64);
	return generateVerificationId(publicKey);
}

/**
 * Get own verification ID
 */
export function getOwnVerificationId(): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const publicKey = getPublicKey();
	return generateVerificationId(publicKey);
}
