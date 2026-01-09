/**
 * Asymmetric Encryption Module
 * X25519 key pairs and sealed box encryption via libsodium
 */

import { getSodium } from './init';
import { toBase64, fromBase64 } from './utils';

/**
 * Key pair structure
 */
export interface KeyPair {
	publicKey: Uint8Array;
	privateKey: Uint8Array;
}

/**
 * Serialized key pair (base64 encoded)
 */
export interface SerializedKeyPair {
	publicKey: string;
	privateKey: string;
}

/**
 * Generate an X25519 key pair for asymmetric encryption
 */
export function generateKeyPair(): KeyPair {
	const sodium = getSodium();
	const keyPair = sodium.crypto_box_keypair();
	
	return {
		publicKey: keyPair.publicKey,
		privateKey: keyPair.privateKey
	};
}

/**
 * Serialize a key pair to base64 strings
 */
export function serializeKeyPair(keyPair: KeyPair): SerializedKeyPair {
	return {
		publicKey: toBase64(keyPair.publicKey),
		privateKey: toBase64(keyPair.privateKey)
	};
}

/**
 * Deserialize a key pair from base64 strings
 */
export function deserializeKeyPair(serialized: SerializedKeyPair): KeyPair {
	return {
		publicKey: fromBase64(serialized.publicKey),
		privateKey: fromBase64(serialized.privateKey)
	};
}

/**
 * Encrypt data using sealed box (anonymous sender)
 */
export function sealedBoxEncrypt(plaintext: Uint8Array, recipientPublicKey: Uint8Array): string {
	const sodium = getSodium();
	const ciphertext = sodium.crypto_box_seal(plaintext, recipientPublicKey);
	return toBase64(ciphertext);
}

/**
 * Decrypt sealed box data
 */
export function sealedBoxDecrypt(
	ciphertextBase64: string,
	publicKey: Uint8Array,
	privateKey: Uint8Array
): Uint8Array {
	const sodium = getSodium();
	const ciphertext = fromBase64(ciphertextBase64);
	
	const plaintext = sodium.crypto_box_seal_open(ciphertext, publicKey, privateKey);
	
	if (!plaintext) {
		throw new Error('Sealed box decryption failed');
	}
	
	return plaintext;
}

/**
 * Encrypt a key using sealed box for sharing
 */
export function encryptKeyForRecipient(
	keyToShare: Uint8Array,
	recipientPublicKey: Uint8Array
): string {
	return sealedBoxEncrypt(keyToShare, recipientPublicKey);
}

/**
 * Decrypt a shared key using sealed box
 */
export function decryptSharedKey(
	encryptedKey: string,
	publicKey: Uint8Array,
	privateKey: Uint8Array
): Uint8Array {
	return sealedBoxDecrypt(encryptedKey, publicKey, privateKey);
}

/**
 * Encrypt an auth token for a user
 */
export function encryptAuthToken(authToken: string, userPublicKeyBase64: string): string {
	const publicKey = fromBase64(userPublicKeyBase64);
	const tokenBytes = new TextEncoder().encode(authToken);
	return sealedBoxEncrypt(tokenBytes, publicKey);
}

/**
 * Decrypt an auth token
 */
export function decryptAuthToken(
	encryptedToken: string,
	publicKey: Uint8Array,
	privateKey: Uint8Array
): string {
	const tokenBytes = sealedBoxDecrypt(encryptedToken, publicKey, privateKey);
	return new TextDecoder().decode(tokenBytes);
}
