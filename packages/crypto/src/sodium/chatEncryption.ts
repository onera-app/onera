/**
 * Chat Encryption Module
 * Handles per-chat key generation and encryption/decryption
 *
 * Uses LRU cache for chat keys to:
 * 1. Limit memory usage (max 100 cached keys)
 * 2. Automatically expire old entries (10 minute TTL)
 * 3. Prevent unbounded memory growth
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

/**
 * Simple LRU Cache with TTL and secure disposal
 * Inline implementation to avoid lru-cache version compatibility issues
 */
class SecureLRUCache<K, V> {
	private cache = new Map<K, { value: V; timestamp: number }>();
	private readonly maxSize: number;
	private readonly ttl: number;
	private readonly dispose: (value: V) => void;

	constructor(options: { max: number; ttl: number; dispose: (value: V) => void }) {
		this.maxSize = options.max;
		this.ttl = options.ttl;
		this.dispose = options.dispose;
	}

	get(key: K): V | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;

		// Check TTL
		if (Date.now() - entry.timestamp > this.ttl) {
			this.dispose(entry.value);
			this.cache.delete(key);
			return undefined;
		}

		// Update timestamp on access (refresh TTL)
		entry.timestamp = Date.now();

		// Move to end to mark as recently used
		this.cache.delete(key);
		this.cache.set(key, entry);

		return entry.value;
	}

	set(key: K, value: V): void {
		// If key exists, dispose old value
		const existing = this.cache.get(key);
		if (existing) {
			this.dispose(existing.value);
			this.cache.delete(key);
		}

		// Evict oldest entries if at max size
		while (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				const oldEntry = this.cache.get(oldestKey);
				if (oldEntry) {
					this.dispose(oldEntry.value);
				}
				this.cache.delete(oldestKey);
			}
		}

		this.cache.set(key, { value, timestamp: Date.now() });
	}

	clear(): void {
		for (const entry of this.cache.values()) {
			this.dispose(entry.value);
		}
		this.cache.clear();
	}
}

/**
 * LRU cache for chat keys
 * - Max 100 entries to limit memory usage
 * - 10 minute TTL to prevent stale keys
 * - Securely zeros keys on eviction
 */
const chatKeyCache = new SecureLRUCache<string, Uint8Array>({
	max: 100,
	ttl: 10 * 60 * 1000, // 10 minutes
	dispose: (value: Uint8Array) => {
		// Securely zero the key when evicted from cache
		secureZero(value);
	},
});

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
 * The LRU cache dispose function will securely zero each key
 */
export function clearChatKeyCache(): void {
	chatKeyCache.clear();
}

/**
 * Check if a chat is encrypted
 */
export function isChatEncrypted(chat: { is_encrypted?: boolean }): boolean {
	return chat.is_encrypted === true;
}
