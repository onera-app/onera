/**
 * Key Manager Module
 * Manages in-memory storage of decrypted keys and session state
 */

import { writable, type Writable, get } from 'svelte/store';
import { initSodium, isSodiumReady, getSodium } from './init';
import { secureZero, toBase64, fromBase64 } from './utils';
import {
	generateUserKeyBundle,
	keyBundleToStorable,
	unlockWithPassword,
	unlockWithRecoveryKey,
	changePassword,
	type StorableUserKeys,
	type DecryptedUserKeys
} from './masterKey';
import {
	mnemonicToRecoveryKey,
	createRecoveryKeyInfo,
	recoveryKeyToMnemonic,
	type RecoveryKeyInfo
} from './recoveryKey';
import { deriveKEKWithParams } from './keyEncryption';
import { decryptSecretBox, encryptSecretBox } from './symmetric';
import { clearChatKeyCache } from './chatEncryption';
import { clearCredentialsKeyCache } from './credentialsEncryption';

// ============================================
// Stores for reactive UI updates
// ============================================

export const e2eeReady: Writable<boolean> = writable(false);
export const e2eeStatus: Writable<'initializing' | 'locked' | 'unlocking' | 'unlocked' | 'error'> =
	writable('initializing');
export const e2eeUnlocked: Writable<boolean> = writable(false);
export const e2eeError: Writable<string | null> = writable(null);
export const storedUserKeys: Writable<StorableUserKeys | null> = writable(null);

// ============================================
// In-memory key storage (never persisted)
// ============================================

let decryptedKeys: DecryptedUserKeys | null = null;

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;

// ============================================
// Security Settings
// ============================================

export interface E2EESecuritySettings {
	strictSessionLocking: boolean;
	sessionTimeoutMs: number;
}

let securitySettings: E2EESecuritySettings = {
	strictSessionLocking: false,
	sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT_MS
};

export function updateE2EESecuritySettings(settings: Partial<E2EESecuritySettings>): void {
	if (settings.strictSessionLocking !== undefined) {
		securitySettings.strictSessionLocking = settings.strictSessionLocking;
	}
	if (settings.sessionTimeoutMs !== undefined) {
		securitySettings.sessionTimeoutMs = settings.sessionTimeoutMs;
		if (isUnlocked()) {
			resetSessionTimeout();
		}
	}
}

export function getE2EESecuritySettings(): E2EESecuritySettings {
	return { ...securitySettings };
}

export function isStrictSessionLockingEnabled(): boolean {
	return securitySettings.strictSessionLocking;
}

// ============================================
// Initialization
// ============================================

export async function initializeE2EE(): Promise<void> {
	try {
		e2eeStatus.set('initializing');
		await initSodium();
		e2eeReady.set(true);
		e2eeStatus.set('locked');
		console.log('🔐 E2EE system initialized');
	} catch (error) {
		e2eeStatus.set('error');
		e2eeError.set(error instanceof Error ? error.message : 'Failed to initialize E2EE');
		throw error;
	}
}

export function isE2EEReady(): boolean {
	return isSodiumReady();
}

// ============================================
// Key Generation (Registration)
// ============================================

export async function setupUserKeys(
	password: string
): Promise<{ recoveryInfo: RecoveryKeyInfo; storableKeys: StorableUserKeys }> {
	if (!isE2EEReady()) {
		throw new Error('E2EE not initialized');
	}

	e2eeStatus.set('unlocking');
	e2eeError.set(null);

	try {
		const keyBundle = await generateUserKeyBundle(password);
		const storable = keyBundleToStorable(keyBundle);

		decryptedKeys = {
			masterKey: keyBundle.masterKey,
			privateKey: keyBundle.keyPair.privateKey,
			publicKey: keyBundle.keyPair.publicKey
		};

		e2eeUnlocked.set(true);
		e2eeStatus.set('unlocked');
		storedUserKeys.set(storable);
		resetSessionTimeout();
		persistSessionKeys();

		const recoveryInfo = createRecoveryKeyInfo(keyBundle.recoveryKey);
		secureZero(keyBundle.recoveryKey);

		return { recoveryInfo, storableKeys: storable };
	} catch (error) {
		e2eeStatus.set('error');
		e2eeError.set(error instanceof Error ? error.message : 'Failed to setup keys');
		throw error;
	}
}

// ============================================
// Unlock (Login)
// ============================================

export async function unlockWithPasswordFlow(
	password: string,
	keys: StorableUserKeys
): Promise<void> {
	if (!isE2EEReady()) {
		throw new Error('E2EE not initialized');
	}

	e2eeStatus.set('unlocking');
	e2eeError.set(null);

	try {
		storedUserKeys.set(keys);
		decryptedKeys = unlockWithPassword(password, keys);

		e2eeUnlocked.set(true);
		e2eeStatus.set('unlocked');
		resetSessionTimeout();
		persistSessionKeys();

		console.log('🔓 E2EE unlocked successfully');
	} catch (error) {
		e2eeStatus.set('error');
		e2eeError.set(
			error instanceof Error ? error.message : 'Failed to unlock. Check your password.'
		);
		throw error;
	}
}

export async function unlockWithRecoveryMnemonic(
	mnemonic: string,
	keys: StorableUserKeys
): Promise<void> {
	if (!isE2EEReady()) {
		throw new Error('E2EE not initialized');
	}

	e2eeStatus.set('unlocking');
	e2eeError.set(null);

	try {
		const recoveryKey = mnemonicToRecoveryKey(mnemonic);
		decryptedKeys = unlockWithRecoveryKey(recoveryKey, keys);
		secureZero(recoveryKey);

		storedUserKeys.set(keys);
		e2eeUnlocked.set(true);
		e2eeStatus.set('unlocked');
		resetSessionTimeout();
		persistSessionKeys();

		console.log('🔓 E2EE unlocked via recovery key');
	} catch (error) {
		e2eeStatus.set('error');
		e2eeError.set('Invalid recovery phrase');
		throw error;
	}
}

// ============================================
// Key Access
// ============================================

export function getMasterKey(): Uint8Array {
	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}
	resetSessionTimeout();
	return decryptedKeys.masterKey;
}

export function getPrivateKey(): Uint8Array {
	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}
	resetSessionTimeout();
	return decryptedKeys.privateKey;
}

export function getPublicKey(): Uint8Array {
	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}
	resetSessionTimeout();
	return decryptedKeys.publicKey;
}

export function isUnlocked(): boolean {
	return decryptedKeys !== null;
}

// ============================================
// Password Change
// ============================================

export async function changeUserPassword(
	newPassword: string
): Promise<{ encryptedMasterKey: string; masterKeyNonce: string; kekSalt: string; kekOpsLimit: number; kekMemLimit: number }> {
	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}

	const { encryptedMasterKey, kekParams } = await changePassword(
		decryptedKeys.masterKey,
		newPassword
	);

	return {
		encryptedMasterKey: encryptedMasterKey.ciphertext,
		masterKeyNonce: encryptedMasterKey.nonce,
		kekSalt: kekParams.salt,
		kekOpsLimit: kekParams.opsLimit,
		kekMemLimit: kekParams.memLimit
	};
}

// ============================================
// Recovery Mnemonic Access
// ============================================

export function getRecoveryMnemonic(keys: StorableUserKeys): string {
	if (!isUnlocked()) {
		throw new Error('E2EE must be unlocked to view recovery phrase');
	}

	const masterKey = getMasterKey();
	const recoveryKey = decryptSecretBox(
		{ ciphertext: keys.encryptedRecoveryKey, nonce: keys.recoveryKeyNonce },
		masterKey
	);

	const mnemonic = recoveryKeyToMnemonic(recoveryKey);
	secureZero(recoveryKey);

	return mnemonic;
}

// ============================================
// Lock / Session Management
// ============================================

export function lock(clearPersisted: boolean = true): void {
	if (decryptedKeys) {
		secureZero(decryptedKeys.masterKey);
		secureZero(decryptedKeys.privateKey);
		decryptedKeys = null;
	}

	clearChatKeyCache();
	clearCredentialsKeyCache();

	if (clearPersisted) {
		clearPersistedSession();
	}

	e2eeUnlocked.set(false);
	e2eeStatus.set('locked');
	clearSessionTimeout();

	console.log('🔒 E2EE locked');
}

export const lockE2EE = lock;

function resetSessionTimeout(): void {
	clearSessionTimeout();
	sessionTimeoutId = setTimeout(() => {
		console.log('⏰ E2EE session timed out, locking...');
		lock();
	}, securitySettings.sessionTimeoutMs);
}

function clearSessionTimeout(): void {
	if (sessionTimeoutId) {
		clearTimeout(sessionTimeoutId);
		sessionTimeoutId = null;
	}
}

export function extendSession(): void {
	if (isUnlocked()) {
		resetSessionTimeout();
	}
}

// ============================================
// Session Persistence
// ============================================

const LOCAL_STORAGE_KEYS = {
	encryptedMasterKey: 'cortex_session_master_key',
	masterKeyNonce: 'cortex_session_master_key_nonce',
	encryptedPrivateKey: 'cortex_session_private_key',
	privateKeyNonce: 'cortex_session_private_key_nonce',
	publicKey: 'cortex_session_public_key'
};

const SESSION_KEY_STORAGE = 'cortex_session_key';

function persistSessionKeys(): void {
	if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
		return;
	}

	if (!decryptedKeys) {
		return;
	}

	try {
		const sodium = getSodium();
		const sessionKey = sodium.crypto_secretbox_keygen();

		const encryptedMaster = encryptSecretBox(decryptedKeys.masterKey, sessionKey);
		localStorage.setItem(LOCAL_STORAGE_KEYS.encryptedMasterKey, encryptedMaster.ciphertext);
		localStorage.setItem(LOCAL_STORAGE_KEYS.masterKeyNonce, encryptedMaster.nonce);

		const encryptedPrivate = encryptSecretBox(decryptedKeys.privateKey, sessionKey);
		localStorage.setItem(LOCAL_STORAGE_KEYS.encryptedPrivateKey, encryptedPrivate.ciphertext);
		localStorage.setItem(LOCAL_STORAGE_KEYS.privateKeyNonce, encryptedPrivate.nonce);

		localStorage.setItem(LOCAL_STORAGE_KEYS.publicKey, toBase64(decryptedKeys.publicKey));
		sessionStorage.setItem(SESSION_KEY_STORAGE, toBase64(sessionKey));

		secureZero(sessionKey);
		console.log('🔐 Session keys persisted');
	} catch (error) {
		console.error('Failed to persist session keys:', error);
	}
}

function clearPersistedSession(): void {
	if (typeof localStorage !== 'undefined') {
		Object.values(LOCAL_STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
	}
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(SESSION_KEY_STORAGE);
	}
}

export async function tryRestoreSession(): Promise<boolean> {
	if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
		return false;
	}

	try {
		const sessionKeyBase64 = sessionStorage.getItem(SESSION_KEY_STORAGE);
		if (!sessionKeyBase64) {
			return false;
		}

		const encryptedMasterKey = localStorage.getItem(LOCAL_STORAGE_KEYS.encryptedMasterKey);
		const masterKeyNonce = localStorage.getItem(LOCAL_STORAGE_KEYS.masterKeyNonce);
		const encryptedPrivateKey = localStorage.getItem(LOCAL_STORAGE_KEYS.encryptedPrivateKey);
		const privateKeyNonce = localStorage.getItem(LOCAL_STORAGE_KEYS.privateKeyNonce);
		const publicKeyBase64 = localStorage.getItem(LOCAL_STORAGE_KEYS.publicKey);

		if (!encryptedMasterKey || !masterKeyNonce || !encryptedPrivateKey || !privateKeyNonce || !publicKeyBase64) {
			clearPersistedSession();
			return false;
		}

		if (!isSodiumReady()) {
			await initSodium();
		}

		const sessionKey = fromBase64(sessionKeyBase64);

		const masterKey = decryptSecretBox(
			{ ciphertext: encryptedMasterKey, nonce: masterKeyNonce },
			sessionKey
		);

		const privateKey = decryptSecretBox(
			{ ciphertext: encryptedPrivateKey, nonce: privateKeyNonce },
			sessionKey
		);

		const publicKey = fromBase64(publicKeyBase64);

		secureZero(sessionKey);

		decryptedKeys = {
			masterKey,
			privateKey,
			publicKey
		};

		e2eeUnlocked.set(true);
		e2eeStatus.set('unlocked');
		resetSessionTimeout();

		console.log('🔓 E2EE session restored');
		return true;
	} catch (error) {
		console.error('Failed to restore session:', error);
		clearPersistedSession();
		return false;
	}
}

export function hasActiveSession(): boolean {
	if (typeof sessionStorage !== 'undefined' && typeof localStorage !== 'undefined') {
		const hasSessionKey = sessionStorage.getItem(SESSION_KEY_STORAGE) !== null;
		const hasEncryptedData = localStorage.getItem(LOCAL_STORAGE_KEYS.encryptedMasterKey) !== null;
		return hasSessionKey && hasEncryptedData;
	}
	return false;
}

export function clearSession(): void {
	lock(true);
}

// ============================================
// Browser Event Handlers
// ============================================

if (typeof window !== 'undefined') {
	window.addEventListener('pagehide', () => {
		if (securitySettings.strictSessionLocking) {
			lock(true);
		} else {
			lock(false);
		}
	});

	['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
		window.addEventListener(event, extendSession, { passive: true });
	});
}
