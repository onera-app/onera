/**
 * Encoding Utilities
 * Base64 and hex encoding/decoding for crypto operations
 */

import { getSodium } from './init';

/**
 * Encode Uint8Array to base64 string
 */
export function toBase64(data: Uint8Array): string {
	const sodium = getSodium();
	return sodium.to_base64(data, sodium.base64_variants.ORIGINAL);
}

/**
 * Decode base64 string to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
	const sodium = getSodium();
	return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
}

/**
 * Encode Uint8Array to hex string
 */
export function toHex(data: Uint8Array): string {
	const sodium = getSodium();
	return sodium.to_hex(data);
}

/**
 * Decode hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
	const sodium = getSodium();
	return sodium.from_hex(hex);
}

/**
 * Encode string to Uint8Array (UTF-8)
 */
export function toBytes(str: string): Uint8Array {
	return new TextEncoder().encode(str);
}

/**
 * Decode Uint8Array to string (UTF-8)
 */
export function fromBytes(data: Uint8Array): string {
	return new TextDecoder().decode(data);
}

/**
 * Securely compare two byte arrays in constant time
 */
export function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
	const sodium = getSodium();
	if (a.length !== b.length) {
		return false;
	}
	return sodium.memcmp(a, b);
}

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
	const sodium = getSodium();
	return sodium.randombytes_buf(length);
}

/**
 * Securely zero out memory
 */
export function secureZero(data: Uint8Array): void {
	const sodium = getSodium();
	sodium.memzero(data);
}

/**
 * Encrypted data structure with nonce
 */
export interface EncryptedData {
	ciphertext: string;
	nonce: string;
}

/**
 * Encrypted data with additional salt (for key derivation)
 */
export interface EncryptedDataWithSalt extends EncryptedData {
	salt: string;
}
