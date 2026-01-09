/**
 * Chat Encryption Module
 * Handles per-chat key generation and encryption/decryption
 */

import { v4 as uuid } from 'uuid';
import {
	generateSecretKey,
	encryptKey,
	decryptKey,
	encryptString,
	decryptString,
	encryptJSON,
	decryptJSON
} from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';
import { secureZero } from './utils';

/**
 * Encrypted chat data structure
 */
export interface EncryptedChatData {
	encryptedChatKey: string;
	chatKeyNonce: string;
	encryptedTitle: string;
	titleNonce: string;
	encryptedChat: string;
	chatNonce: string;
}

/**
 * Decrypted chat data
 */
export interface DecryptedChatData {
	title: string;
	chat: Record<string, unknown>;
}

const chatKeyCache = new Map<string, Uint8Array>();

/**
 * Create a new encrypted chat
 */
export async function createEncryptedChat(
	title: string,
	chat: Record<string, unknown>
): Promise<{ chatId: string; data: EncryptedChatData }> {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const chatId = uuid();
	const chatKey = generateSecretKey();

	const encryptedChatKeyData = encryptKey(chatKey, masterKey);
	const encryptedTitle = encryptString(title, chatKey);
	const encryptedChat = encryptJSON(chat, chatKey);

	chatKeyCache.set(chatId, chatKey);

	return {
		chatId,
		data: {
			encryptedChatKey: encryptedChatKeyData.ciphertext,
			chatKeyNonce: encryptedChatKeyData.nonce,
			encryptedTitle: encryptedTitle.ciphertext,
			titleNonce: encryptedTitle.nonce,
			encryptedChat: encryptedChat.ciphertext,
			chatNonce: encryptedChat.nonce
		}
	};
}

/**
 * Get or decrypt a chat key
 */
export function getChatKey(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string
): Uint8Array {
	const cached = chatKeyCache.get(chatId);
	if (cached) {
		return cached;
	}

	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const chatKey = decryptKey(
		{ ciphertext: encryptedChatKey, nonce: chatKeyNonce },
		masterKey
	);

	chatKeyCache.set(chatId, chatKey);
	return chatKey;
}

/**
 * Decrypt chat content
 */
export function decryptChat(
	chatId: string,
	encryptedData: EncryptedChatData
): DecryptedChatData {
	const chatKey = getChatKey(
		chatId,
		encryptedData.encryptedChatKey,
		encryptedData.chatKeyNonce
	);

	const title = decryptString(
		{ ciphertext: encryptedData.encryptedTitle, nonce: encryptedData.titleNonce },
		chatKey
	);

	const chat = decryptJSON<Record<string, unknown>>(
		{ ciphertext: encryptedData.encryptedChat, nonce: encryptedData.chatNonce },
		chatKey
	);

	return { title, chat };
}

/**
 * Update encrypted chat content
 */
export function updateEncryptedChat(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	title?: string,
	chat?: Record<string, unknown>
): Partial<EncryptedChatData> {
	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	const result: Partial<EncryptedChatData> = {};

	if (title !== undefined) {
		const encryptedTitle = encryptString(title, chatKey);
		result.encryptedTitle = encryptedTitle.ciphertext;
		result.titleNonce = encryptedTitle.nonce;
	}

	if (chat !== undefined) {
		const encryptedChat = encryptJSON(chat, chatKey);
		result.encryptedChat = encryptedChat.ciphertext;
		result.chatNonce = encryptedChat.nonce;
	}

	return result;
}

/**
 * Encrypt just the chat content
 */
export function encryptChatContent(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	chat: Record<string, unknown>
): { encryptedChat: string; chatNonce: string } {
	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	const encrypted = encryptJSON(chat, chatKey);
	return {
		encryptedChat: encrypted.ciphertext,
		chatNonce: encrypted.nonce
	};
}

/**
 * Encrypt just the title
 */
export function encryptChatTitle(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	title: string
): { encryptedTitle: string; titleNonce: string } {
	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	const encrypted = encryptString(title, chatKey);
	return {
		encryptedTitle: encrypted.ciphertext,
		titleNonce: encrypted.nonce
	};
}

/**
 * Decrypt just the title
 */
export function decryptChatTitle(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	encryptedTitle: string,
	titleNonce: string
): string {
	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	return decryptString({ ciphertext: encryptedTitle, nonce: titleNonce }, chatKey);
}

/**
 * Decrypt just the chat content
 */
export function decryptChatContent(
	chatId: string,
	encryptedChatKey: string,
	chatKeyNonce: string,
	encryptedChat: string,
	chatNonce: string
): Record<string, unknown> {
	const chatKey = getChatKey(chatId, encryptedChatKey, chatKeyNonce);
	return decryptJSON({ ciphertext: encryptedChat, nonce: chatNonce }, chatKey);
}

/**
 * Clear chat key cache (call on lock)
 */
export function clearChatKeyCache(): void {
	for (const key of chatKeyCache.values()) {
		secureZero(key);
	}
	chatKeyCache.clear();
}

/**
 * Check if a chat is encrypted
 */
export function isChatEncrypted(chat: { is_encrypted?: boolean }): boolean {
	return chat.is_encrypted === true;
}
