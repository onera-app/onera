/**
 * Credentials Encryption Module
 * Handles encryption of LLM API credentials using master key
 */

import {
	generateSecretKey,
	encryptKey,
	decryptKey,
	encryptJSON,
	decryptJSON,
	encryptString,
	decryptString
} from './symmetric';
import type { EncryptedData } from './utils';
import { getMasterKey, isUnlocked } from './keyManager';
import { secureZero } from './utils';

/**
 * LLM credential structure
 */
export interface LLMCredential {
	api_key: string;
	base_url?: string;
	org_id?: string;
	config?: Record<string, unknown>;
}

/**
 * Encrypted credential for storage
 */
export interface EncryptedCredentialData {
	encrypted_data: string;
	iv: string;
}

/**
 * Encrypt credentials using the master key
 */
export function encryptCredential(credential: LLMCredential): EncryptedCredentialData {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptJSON(credential, masterKey);

	return {
		encrypted_data: encrypted.ciphertext,
		iv: encrypted.nonce
	};
}

/**
 * Decrypt credentials using the master key
 */
export function decryptCredential(encryptedData: EncryptedCredentialData): LLMCredential {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	return decryptJSON<LLMCredential>(
		{ ciphertext: encryptedData.encrypted_data, nonce: encryptedData.iv },
		masterKey
	);
}

/**
 * Batch decrypt multiple credentials
 */
export function decryptCredentials(
	encryptedCredentials: Array<{
		id: string;
		provider: string;
		name: string;
		encrypted_data: string;
		iv: string;
	}>
): Array<{ id: string; provider: string; name: string } & LLMCredential> {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();

	return encryptedCredentials.map((enc) => {
		try {
			const decrypted = decryptJSON<LLMCredential>(
				{ ciphertext: enc.encrypted_data, nonce: enc.iv },
				masterKey
			);
			return {
				id: enc.id,
				provider: enc.provider,
				name: enc.name,
				...decrypted
			};
		} catch (error) {
			console.error(`Failed to decrypt credential ${enc.id}:`, error);
			return {
				id: enc.id,
				provider: enc.provider,
				name: enc.name,
				api_key: '[Decryption failed]'
			};
		}
	});
}

// Organization credentials key cache
let orgCredentialsKey: Uint8Array | null = null;

/**
 * Generate a new organization credentials key
 */
export function generateOrgCredentialsKey(): Uint8Array {
	return generateSecretKey();
}

/**
 * Encrypt org credentials key for a user
 */
export function encryptOrgCredentialsKeyForUser(
	credentialsKey: Uint8Array,
	userMasterKey?: Uint8Array
): EncryptedData {
	const masterKey = userMasterKey || getMasterKey();
	return encryptKey(credentialsKey, masterKey);
}

/**
 * Decrypt org credentials key
 */
export function decryptOrgCredentialsKey(encryptedCredentialsKey: EncryptedData): Uint8Array {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const credentialsKey = decryptKey(encryptedCredentialsKey, masterKey);
	orgCredentialsKey = credentialsKey;

	return credentialsKey;
}

/**
 * Encrypt credential using org credentials key
 */
export function encryptCredentialWithOrgKey(
	credential: LLMCredential,
	credentialsKey?: Uint8Array
): EncryptedCredentialData {
	const key = credentialsKey || orgCredentialsKey;
	if (!key) {
		throw new Error('Organization credentials key not available');
	}

	const encrypted = encryptJSON(credential, key);
	return {
		encrypted_data: encrypted.ciphertext,
		iv: encrypted.nonce
	};
}

/**
 * Decrypt credential using org credentials key
 */
export function decryptCredentialWithOrgKey(
	encryptedData: EncryptedCredentialData,
	credentialsKey?: Uint8Array
): LLMCredential {
	const key = credentialsKey || orgCredentialsKey;
	if (!key) {
		throw new Error('Organization credentials key not available');
	}

	return decryptJSON<LLMCredential>(
		{ ciphertext: encryptedData.encrypted_data, nonce: encryptedData.iv },
		key
	);
}

/**
 * Clear cached credentials key (on lock)
 */
export function clearCredentialsKeyCache(): void {
	if (orgCredentialsKey) {
		secureZero(orgCredentialsKey);
		orgCredentialsKey = null;
	}
}

// ============================================
// Credential Metadata Encryption (name, provider)
// ============================================

/**
 * Encrypted credential name data for storage
 */
export interface EncryptedCredentialNameData {
	encryptedName: string;
	nameNonce: string;
}

/**
 * Encrypted credential provider data for storage
 */
export interface EncryptedCredentialProviderData {
	encryptedProvider: string;
	providerNonce: string;
}

/**
 * Encrypt credential name
 */
export function encryptCredentialName(name: string): EncryptedCredentialNameData {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptString(name, masterKey);

	return {
		encryptedName: encrypted.ciphertext,
		nameNonce: encrypted.nonce
	};
}

/**
 * Decrypt credential name
 */
export function decryptCredentialName(encryptedName: string, nameNonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encryptedName, nonce: nameNonce }, masterKey);
	} catch (error) {
		console.error('Failed to decrypt credential name:', error);
		return 'Encrypted Credential';
	}
}

/**
 * Encrypt credential provider
 */
export function encryptCredentialProvider(provider: string): EncryptedCredentialProviderData {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const masterKey = getMasterKey();
	const encrypted = encryptString(provider, masterKey);

	return {
		encryptedProvider: encrypted.ciphertext,
		providerNonce: encrypted.nonce
	};
}

/**
 * Decrypt credential provider
 */
export function decryptCredentialProvider(encryptedProvider: string, providerNonce: string): string {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	try {
		const masterKey = getMasterKey();
		return decryptString({ ciphertext: encryptedProvider, nonce: providerNonce }, masterKey);
	} catch (error) {
		console.error('Failed to decrypt credential provider:', error);
		return 'unknown';
	}
}
