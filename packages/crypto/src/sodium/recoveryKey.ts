/**
 * Recovery Key Module
 * BIP39 mnemonic encoding for recovery keys
 *
 * IMPORTANT: Recovery key is directly encoded as BIP39 mnemonic (no hashing).
 * This allows the mnemonic to be converted back to the original key.
 */

import * as bip39 from 'bip39';
import { getSodium } from './init';
import { toHex, fromHex } from './utils';

/**
 * Convert a recovery key to a BIP39 mnemonic phrase (24 words)
 *
 * NOTE: The recovery key is directly converted to mnemonic without hashing.
 * This is required for the mnemonic to be reversible back to the original key.
 * Previous versions incorrectly hashed the key, making recovery impossible.
 */
export function recoveryKeyToMnemonic(recoveryKey: Uint8Array): string {
	// Recovery key must be exactly 32 bytes for 24-word mnemonic
	if (recoveryKey.length !== 32) {
		throw new Error('Recovery key must be 32 bytes');
	}
	// Direct conversion - no hashing (hashing would make it one-way!)
	const entropy = toHex(recoveryKey);
	return bip39.entropyToMnemonic(entropy);
}

/**
 * Convert a BIP39 mnemonic phrase back to recovery key bytes
 */
export function mnemonicToRecoveryKey(mnemonic: string): Uint8Array {
	if (!bip39.validateMnemonic(mnemonic)) {
		throw new Error('Invalid recovery phrase');
	}
	const entropy = bip39.mnemonicToEntropy(mnemonic);
	return fromHex(entropy);
}

/**
 * Validate a mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
	return bip39.validateMnemonic(mnemonic);
}

/**
 * Format a mnemonic for display (4 words per line)
 */
export function formatMnemonicForDisplay(mnemonic: string): string[][] {
	const words = mnemonic.split(' ');
	const groups: string[][] = [];
	
	for (let i = 0; i < words.length; i += 4) {
		groups.push(words.slice(i, i + 4));
	}
	
	return groups;
}

/**
 * Generate a verification ID from a public key
 */
export function generateVerificationId(publicKey: Uint8Array): string {
	const sodium = getSodium();
	const hash = sodium.crypto_hash_sha256(publicKey);
	const entropy = toHex(hash.slice(0, 16));
	return bip39.entropyToMnemonic(entropy);
}

/**
 * Format verification ID for display (3 words per line)
 */
export function formatVerificationIdForDisplay(verificationId: string): string[][] {
	const words = verificationId.split(' ');
	const groups: string[][] = [];
	
	for (let i = 0; i < words.length; i += 3) {
		groups.push(words.slice(i, i + 3));
	}
	
	return groups;
}

/**
 * Recovery key display info
 */
export interface RecoveryKeyInfo {
	mnemonic: string;
	formattedGroups: string[][];
	wordCount: number;
}

/**
 * Create recovery key display info
 */
export function createRecoveryKeyInfo(recoveryKey: Uint8Array): RecoveryKeyInfo {
	const mnemonic = recoveryKeyToMnemonic(recoveryKey);
	return {
		mnemonic,
		formattedGroups: formatMnemonicForDisplay(mnemonic),
		wordCount: 24
	};
}
