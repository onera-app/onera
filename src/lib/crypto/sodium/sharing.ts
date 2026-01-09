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
 * Decrypt a shared chat key
 */
export function decryptReceivedChatKey(encryptedChatKey: string): Uint8Array {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const publicKey = getPublicKey();
	const privateKey = getPrivateKey();

	return decryptSharedKey(encryptedChatKey, publicKey, privateKey);
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
