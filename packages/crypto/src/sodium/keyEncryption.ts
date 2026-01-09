/**
 * Key Encryption Key (KEK) Derivation Module
 * Uses Argon2id for deriving encryption keys from passwords
 */

import { getSodium } from './init';
import { toBase64, fromBase64, randomBytes } from './utils';

const CRYPTO_PWHASH_SALTBYTES = 16;
const CRYPTO_SECRETBOX_KEYBYTES = 32;
const CRYPTO_PWHASH_ALG_ARGON2ID13 = 2;

const CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE = 2;
const CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE = 67108864; // 64MB

/**
 * Argon2id parameters
 */
export interface Argon2Params {
	salt: string;
	opsLimit: number;
	memLimit: number;
}

/**
 * Default Argon2id parameters
 */
export function getDefaultArgon2Params(): { opsLimit: number; memLimit: number } {
	return {
		opsLimit: CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
		memLimit: CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE
	};
}

const MEMORY_FALLBACKS = [
	{ memLimit: 67108864, opsLimit: 2 },
	{ memLimit: 33554432, opsLimit: 3 },
	{ memLimit: 16777216, opsLimit: 4 },
];

/**
 * Fallback Argon2id parameters for low-memory devices
 */
export function getFallbackArgon2Params(
	attemptNumber: number
): { opsLimit: number; memLimit: number } | null {
	if (attemptNumber >= MEMORY_FALLBACKS.length) {
		return null;
	}
	return MEMORY_FALLBACKS[attemptNumber];
}

/**
 * Generate a random salt for Argon2id
 */
export function generateSalt(): string {
	const salt = randomBytes(CRYPTO_PWHASH_SALTBYTES);
	return toBase64(salt);
}

/**
 * Derive a Key Encryption Key (KEK) from a password using Argon2id
 */
export function deriveKEK(
	password: string,
	saltBase64: string,
	opsLimit: number,
	memLimit: number
): Uint8Array {
	const sodium = getSodium();
	const salt = fromBase64(saltBase64);
	
	const key = sodium.crypto_pwhash(
		CRYPTO_SECRETBOX_KEYBYTES,
		password,
		salt,
		opsLimit,
		memLimit,
		CRYPTO_PWHASH_ALG_ARGON2ID13
	);
	
	return key;
}

/**
 * Derive KEK with automatic fallback for low-memory devices
 */
export async function deriveKEKWithFallback(
	password: string,
	saltBase64?: string
): Promise<{ key: Uint8Array; params: Argon2Params }> {
	const salt = saltBase64 || generateSalt();
	
	for (let attemptNumber = 0; attemptNumber < MEMORY_FALLBACKS.length; attemptNumber++) {
		const params = MEMORY_FALLBACKS[attemptNumber];
		
		try {
			console.log(`Argon2id: Trying with memLimit=${params.memLimit / 1024 / 1024}MB`);
			const key = deriveKEK(password, salt, params.opsLimit, params.memLimit);
			console.log(`Argon2id: Success with memLimit=${params.memLimit / 1024 / 1024}MB`);
			return {
				key,
				params: {
					salt,
					opsLimit: params.opsLimit,
					memLimit: params.memLimit
				}
			};
		} catch (error) {
			console.warn(
				`Argon2id failed with memLimit=${params.memLimit / 1024 / 1024}MB:`,
				error instanceof Error ? error.message : error
			);
		}
	}
	
	throw new Error('Unable to derive key: device does not have enough memory');
}

/**
 * Derive KEK using existing params
 */
export function deriveKEKWithParams(password: string, params: Argon2Params): Uint8Array {
	return deriveKEK(password, params.salt, params.opsLimit, params.memLimit);
}
