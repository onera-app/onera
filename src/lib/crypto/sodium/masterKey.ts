/**
 * Master Key Module
 * Handles generation, encryption, and management of the master encryption key
 */

import { encryptKey, decryptKey, generateSecretKey } from './symmetric';
import { deriveKEKWithFallback, deriveKEKWithParams, type Argon2Params } from './keyEncryption';
import { generateKeyPair, type KeyPair } from './asymmetric';
import { toBase64, fromBase64, secureZero, type EncryptedData } from './utils';

/**
 * All keys generated during user registration
 */
export interface UserKeyBundle {
	masterKey: Uint8Array;
	recoveryKey: Uint8Array;
	keyPair: KeyPair;
	encryptedMasterKey: EncryptedData;
	encryptedPrivateKey: EncryptedData;
	encryptedRecoveryKey: EncryptedData;
	masterKeyRecovery: EncryptedData;
	kekParams: Argon2Params;
	publicKey: string;
}

/**
 * Generate all keys needed for a new user registration
 */
export async function generateUserKeyBundle(password: string): Promise<UserKeyBundle> {
	const masterKey = generateSecretKey();
	const recoveryKey = generateSecretKey();
	const keyPair = generateKeyPair();
	
	const { key: kek, params: kekParams } = await deriveKEKWithFallback(password);
	
	const encryptedMasterKey = encryptKey(masterKey, kek);
	const encryptedPrivateKey = encryptKey(keyPair.privateKey, masterKey);
	const encryptedRecoveryKey = encryptKey(recoveryKey, masterKey);
	const masterKeyRecovery = encryptKey(masterKey, recoveryKey);
	
	secureZero(kek);
	
	return {
		masterKey,
		recoveryKey,
		keyPair,
		encryptedMasterKey,
		encryptedPrivateKey,
		encryptedRecoveryKey,
		masterKeyRecovery,
		kekParams,
		publicKey: toBase64(keyPair.publicKey)
	};
}

/**
 * Server-storable key data
 */
export interface StorableUserKeys {
	kekSalt: string;
	kekOpsLimit: number;
	kekMemLimit: number;
	encryptedMasterKey: string;
	masterKeyNonce: string;
	publicKey: string;
	encryptedPrivateKey: string;
	privateKeyNonce: string;
	encryptedRecoveryKey: string;
	recoveryKeyNonce: string;
	masterKeyRecovery: string;
	masterKeyRecoveryNonce: string;
}

/**
 * Convert key bundle to server-storable format
 */
export function keyBundleToStorable(bundle: UserKeyBundle): StorableUserKeys {
	return {
		kekSalt: bundle.kekParams.salt,
		kekOpsLimit: bundle.kekParams.opsLimit,
		kekMemLimit: bundle.kekParams.memLimit,
		encryptedMasterKey: bundle.encryptedMasterKey.ciphertext,
		masterKeyNonce: bundle.encryptedMasterKey.nonce,
		publicKey: bundle.publicKey,
		encryptedPrivateKey: bundle.encryptedPrivateKey.ciphertext,
		privateKeyNonce: bundle.encryptedPrivateKey.nonce,
		encryptedRecoveryKey: bundle.encryptedRecoveryKey.ciphertext,
		recoveryKeyNonce: bundle.encryptedRecoveryKey.nonce,
		masterKeyRecovery: bundle.masterKeyRecovery.ciphertext,
		masterKeyRecoveryNonce: bundle.masterKeyRecovery.nonce
	};
}

/**
 * Decrypted keys after successful unlock
 */
export interface DecryptedUserKeys {
	masterKey: Uint8Array;
	privateKey: Uint8Array;
	publicKey: Uint8Array;
}

/**
 * Unlock user keys using password
 */
export function unlockWithPassword(
	password: string,
	storedKeys: StorableUserKeys
): DecryptedUserKeys {
	const kek = deriveKEKWithParams(password, {
		salt: storedKeys.kekSalt,
		opsLimit: storedKeys.kekOpsLimit,
		memLimit: storedKeys.kekMemLimit
	});
	
	try {
		const masterKey = decryptKey(
			{
				ciphertext: storedKeys.encryptedMasterKey,
				nonce: storedKeys.masterKeyNonce
			},
			kek
		);
		
		const privateKey = decryptKey(
			{
				ciphertext: storedKeys.encryptedPrivateKey,
				nonce: storedKeys.privateKeyNonce
			},
			masterKey
		);
		
		const publicKey = fromBase64(storedKeys.publicKey);
		
		return {
			masterKey,
			privateKey,
			publicKey
		};
	} finally {
		secureZero(kek);
	}
}

/**
 * Unlock user keys using recovery key
 */
export function unlockWithRecoveryKey(
	recoveryKey: Uint8Array,
	storedKeys: StorableUserKeys
): DecryptedUserKeys {
	const masterKey = decryptKey(
		{
			ciphertext: storedKeys.masterKeyRecovery,
			nonce: storedKeys.masterKeyRecoveryNonce
		},
		recoveryKey
	);
	
	const privateKey = decryptKey(
		{
			ciphertext: storedKeys.encryptedPrivateKey,
			nonce: storedKeys.privateKeyNonce
		},
		masterKey
	);
	
	const publicKey = fromBase64(storedKeys.publicKey);
	
	return {
		masterKey,
		privateKey,
		publicKey
	};
}

/**
 * Get the recovery key (for display to user)
 */
export function getRecoveryKey(
	masterKey: Uint8Array,
	storedKeys: StorableUserKeys
): Uint8Array {
	return decryptKey(
		{
			ciphertext: storedKeys.encryptedRecoveryKey,
			nonce: storedKeys.recoveryKeyNonce
		},
		masterKey
	);
}

/**
 * Change password - re-encrypt master key with new password
 */
export async function changePassword(
	masterKey: Uint8Array,
	newPassword: string
): Promise<{ encryptedMasterKey: EncryptedData; kekParams: Argon2Params }> {
	const { key: newKek, params: kekParams } = await deriveKEKWithFallback(newPassword);
	
	try {
		const encryptedMasterKey = encryptKey(masterKey, newKek);
		return {
			encryptedMasterKey,
			kekParams
		};
	} finally {
		secureZero(newKek);
	}
}
