/**
 * Symmetric Encryption Module
 * XSalsa20-Poly1305 secretbox encryption via libsodium
 */

import { getSodium } from './init';
import { toBase64, fromBase64, toBytes, fromBytes, randomBytes, type EncryptedData } from './utils';

const CRYPTO_SECRETBOX_KEYBYTES = 32;
const CRYPTO_SECRETBOX_NONCEBYTES = 24;

/**
 * Generate a random secret key for symmetric encryption
 */
export function generateSecretKey(): Uint8Array {
	return randomBytes(CRYPTO_SECRETBOX_KEYBYTES);
}

/**
 * Encrypt data using XSalsa20-Poly1305 (secretbox)
 */
export function encryptSecretBox(plaintext: Uint8Array, key: Uint8Array): EncryptedData {
	const sodium = getSodium();
	const nonce = randomBytes(CRYPTO_SECRETBOX_NONCEBYTES);
	const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key);
	
	return {
		ciphertext: toBase64(ciphertext),
		nonce: toBase64(nonce)
	};
}

/**
 * Decrypt data using XSalsa20-Poly1305 (secretbox)
 */
export function decryptSecretBox(encrypted: EncryptedData, key: Uint8Array): Uint8Array {
	const sodium = getSodium();
	const ciphertext = fromBase64(encrypted.ciphertext);
	const nonce = fromBase64(encrypted.nonce);
	
	const plaintext = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
	
	if (!plaintext) {
		throw new Error('Decryption failed: invalid key or tampered ciphertext');
	}
	
	return plaintext;
}

/**
 * Encrypt a string using secretbox
 */
export function encryptString(plaintext: string, key: Uint8Array): EncryptedData {
	return encryptSecretBox(toBytes(plaintext), key);
}

/**
 * Decrypt to a string using secretbox
 */
export function decryptString(encrypted: EncryptedData, key: Uint8Array): string {
	return fromBytes(decryptSecretBox(encrypted, key));
}

/**
 * Encrypt a JSON object using secretbox
 */
export function encryptJSON<T>(data: T, key: Uint8Array): EncryptedData {
	return encryptString(JSON.stringify(data), key);
}

/**
 * Decrypt to a JSON object using secretbox
 */
export function decryptJSON<T>(encrypted: EncryptedData, key: Uint8Array): T {
	return JSON.parse(decryptString(encrypted, key)) as T;
}

/**
 * Encrypt a key with another key
 */
export function encryptKey(keyToEncrypt: Uint8Array, encryptionKey: Uint8Array): EncryptedData {
	return encryptSecretBox(keyToEncrypt, encryptionKey);
}

/**
 * Decrypt a key with another key
 */
export function decryptKey(encrypted: EncryptedData, decryptionKey: Uint8Array): Uint8Array {
	return decryptSecretBox(encrypted, decryptionKey);
}
