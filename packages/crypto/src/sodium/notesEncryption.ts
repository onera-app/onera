/**
 * Notes Encryption Module
 * Handles encryption of note titles and content using per-note keys
 * (with fallback to master key for legacy notes)
 */

import {
	generateSecretKey,
	encryptKey,
	decryptKey,
	encryptString,
	decryptString
} from './symmetric';
import { getMasterKey, isUnlocked } from './keyManager';
import { secureZero } from './utils';

/**
 * Encrypted note data for storage
 */
export interface EncryptedNoteData {
	encryptedNoteKey?: string;
	noteKeyNonce?: string;
	encryptedTitle: string;
	titleNonce: string;
	encryptedContent: string;
	contentNonce: string;
}

/**
 * Decrypted note data
 */
export interface DecryptedNoteData {
	title: string;
	content: string;
}

/**
 * Simple LRU Cache with TTL and secure disposal
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

		if (Date.now() - entry.timestamp > this.ttl) {
			this.dispose(entry.value);
			this.cache.delete(key);
			return undefined;
		}

		entry.timestamp = Date.now();
		this.cache.delete(key);
		this.cache.set(key, entry);
		return entry.value;
	}

	set(key: K, value: V): void {
		const existing = this.cache.get(key);
		if (existing) {
			this.dispose(existing.value);
			this.cache.delete(key);
		}

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
 * LRU cache for note keys
 */
const noteKeyCache = new SecureLRUCache<string, Uint8Array>({
	max: 100,
	ttl: 10 * 60 * 1000, // 10 minutes
	dispose: (value: Uint8Array) => {
		secureZero(value);
	},
});

/**
 * Get or decrypt a note key
 * Falls back to master key if no note key is provided (legacy notes)
 */
export function getNoteKey(
	noteId: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): Uint8Array {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();

	// Case 1: Legacy note (no per-note key)
	if (!encryptedNoteKey || !noteKeyNonce) {
		return masterKey;
	}

	// Case 2: Per-note key (check cache first)
	const cached = noteKeyCache.get(noteId);
	if (cached) {
		return cached;
	}

	// Decrypt per-note key using master key
	const noteKey = decryptKey(
		{ ciphertext: encryptedNoteKey, nonce: noteKeyNonce },
		masterKey
	);

	noteKeyCache.set(noteId, noteKey);
	return noteKey;
}

/**
 * Encrypt note title
 */
export function encryptNoteTitle(
	noteId: string,
	title: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): { encryptedTitle: string; titleNonce: string } {
	const key = getNoteKey(noteId, encryptedNoteKey, noteKeyNonce);
	const encrypted = encryptString(title, key);

	return {
		encryptedTitle: encrypted.ciphertext,
		titleNonce: encrypted.nonce
	};
}

/**
 * Decrypt note title
 */
export function decryptNoteTitle(
	noteId: string,
	encryptedTitle: string,
	titleNonce: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): string {
	try {
		const key = getNoteKey(noteId, encryptedNoteKey, noteKeyNonce);
		return decryptString({ ciphertext: encryptedTitle, nonce: titleNonce }, key);
	} catch (error) {
		console.error('Failed to decrypt note title:', error);
		return 'Untitled';
	}
}

/**
 * Encrypt note content
 */
export function encryptNoteContent(
	noteId: string,
	content: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): { encryptedContent: string; contentNonce: string } {
	const key = getNoteKey(noteId, encryptedNoteKey, noteKeyNonce);
	const encrypted = encryptString(content, key);

	return {
		encryptedContent: encrypted.ciphertext,
		contentNonce: encrypted.nonce
	};
}

/**
 * Decrypt note content
 */
export function decryptNoteContent(
	noteId: string,
	encryptedContent: string,
	contentNonce: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): string {
	try {
		const key = getNoteKey(noteId, encryptedNoteKey, noteKeyNonce);
		return decryptString({ ciphertext: encryptedContent, nonce: contentNonce }, key);
	} catch (error) {
		console.error('Failed to decrypt note content:', error);
		return '';
	}
}

/**
 * Encrypt a complete note (title + content)
 */
export function encryptNote(
	noteId: string,
	title: string,
	content: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): EncryptedNoteData {
	const encryptedTitle = encryptNoteTitle(noteId, title, encryptedNoteKey, noteKeyNonce);
	const encryptedContent = encryptNoteContent(noteId, content, encryptedNoteKey, noteKeyNonce);

	return {
		encryptedNoteKey,
		noteKeyNonce,
		...encryptedTitle,
		...encryptedContent
	};
}

/**
 * Decrypt a complete note (title + content)
 */
export function decryptNote(
	noteId: string,
	encryptedTitle: string,
	titleNonce: string,
	encryptedContent: string,
	contentNonce: string,
	encryptedNoteKey?: string,
	noteKeyNonce?: string
): DecryptedNoteData {
	return {
		title: decryptNoteTitle(noteId, encryptedTitle, titleNonce, encryptedNoteKey, noteKeyNonce),
		content: decryptNoteContent(noteId, encryptedContent, contentNonce, encryptedNoteKey, noteKeyNonce)
	};
}

/**
 * Create a new encrypted note with its own key
 */
export function createEncryptedNote(
	noteId: string,
	title: string,
	content: string
): EncryptedNoteData {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const noteKey = generateSecretKey();

	const encryptedNoteKeyData = encryptKey(noteKey, masterKey);

	// Cache the raw note key
	noteKeyCache.set(noteId, noteKey);

	const encryptedTitle = encryptString(title, noteKey);
	const encryptedContent = encryptString(content, noteKey);

	return {
		encryptedNoteKey: encryptedNoteKeyData.ciphertext,
		noteKeyNonce: encryptedNoteKeyData.nonce,
		encryptedTitle: encryptedTitle.ciphertext,
		titleNonce: encryptedTitle.nonce,
		encryptedContent: encryptedContent.ciphertext,
		contentNonce: encryptedContent.nonce
	};
}

/**
 * Clear note key cache
 */
export function clearNoteKeyCache(): void {
	noteKeyCache.clear();
}
