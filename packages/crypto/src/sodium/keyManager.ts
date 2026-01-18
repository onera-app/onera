/**
 * Key Manager Module (Framework-Agnostic)
 * Manages in-memory storage of decrypted keys and session state
 */

import { initSodium, isSodiumReady } from './init';
import { secureZero, fromBase64, type EncryptedData } from './utils';
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
import { decryptSecretBox } from './symmetric';
import { clearChatKeyCache } from './chatEncryption';
import { clearCredentialsKeyCache } from './credentialsEncryption';
import {
	createSecureSession,
	restoreSecureSession,
	clearSecureSession,
	hasValidSecureSession,
} from '../session';

// ============================================
// Types
// ============================================

export type E2EEStatusType = 'initializing' | 'locked' | 'unlocking' | 'unlocked' | 'error';

export interface E2EEState {
	ready: boolean;
	status: E2EEStatusType;
	unlocked: boolean;
	error: string | null;
	storedKeys: StorableUserKeys | null;
}

export interface E2EESecuritySettings {
	strictSessionLocking: boolean;
	sessionTimeoutMs: number;
}

type StateListener = (state: E2EEState) => void;

// ============================================
// Internal State
// ============================================

let decryptedKeys: DecryptedUserKeys | null = null;
let state: E2EEState = {
	ready: false,
	status: 'initializing',
	unlocked: false,
	error: null,
	storedKeys: null
};

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<StateListener>();

let securitySettings: E2EESecuritySettings = {
	strictSessionLocking: false,
	sessionTimeoutMs: DEFAULT_SESSION_TIMEOUT_MS
};

// ============================================
// State Management (Pub/Sub)
// ============================================

function updateState(partial: Partial<E2EEState>): void {
	state = { ...state, ...partial };
	listeners.forEach((listener) => listener(state));
}

export function subscribe(listener: StateListener): () => void {
	listeners.add(listener);
	listener(state); // Immediately call with current state
	return () => listeners.delete(listener);
}

export function getState(): E2EEState {
	return { ...state };
}

// Legacy exports for backwards compatibility
export const e2eeReady = {
	subscribe: (fn: (val: boolean) => void) => {
		const unsub = subscribe((s) => fn(s.ready));
		return unsub;
	},
	set: (val: boolean) => updateState({ ready: val })
};

export const e2eeStatus = {
	subscribe: (fn: (val: E2EEStatusType) => void) => {
		const unsub = subscribe((s) => fn(s.status));
		return unsub;
	},
	set: (val: E2EEStatusType) => updateState({ status: val })
};

export const e2eeUnlocked = {
	subscribe: (fn: (val: boolean) => void) => {
		const unsub = subscribe((s) => fn(s.unlocked));
		return unsub;
	},
	set: (val: boolean) => updateState({ unlocked: val })
};

export const e2eeError = {
	subscribe: (fn: (val: string | null) => void) => {
		const unsub = subscribe((s) => fn(s.error));
		return unsub;
	},
	set: (val: string | null) => updateState({ error: val })
};

export const storedUserKeys = {
	subscribe: (fn: (val: StorableUserKeys | null) => void) => {
		const unsub = subscribe((s) => fn(s.storedKeys));
		return unsub;
	},
	set: (val: StorableUserKeys | null) => updateState({ storedKeys: val })
};

// ============================================
// Security Settings
// ============================================

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
		updateState({ status: 'initializing' });
		await initSodium();
		updateState({ ready: true, status: 'locked' });
		console.log('🔐 E2EE system initialized');
	} catch (error) {
		updateState({
			status: 'error',
			error: error instanceof Error ? error.message : 'Failed to initialize E2EE'
		});
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

	updateState({ status: 'unlocking', error: null });

	try {
		const keyBundle = await generateUserKeyBundle(password);
		const storable = keyBundleToStorable(keyBundle);

		decryptedKeys = {
			masterKey: keyBundle.masterKey,
			privateKey: keyBundle.keyPair.privateKey,
			publicKey: keyBundle.keyPair.publicKey
		};

		updateState({
			unlocked: true,
			status: 'unlocked',
			storedKeys: storable
		});
		resetSessionTimeout();
		persistSessionKeys().catch(() => {}); // Best effort persistence

		const recoveryInfo = createRecoveryKeyInfo(keyBundle.recoveryKey);
		secureZero(keyBundle.recoveryKey);

		return { recoveryInfo, storableKeys: storable };
	} catch (error) {
		updateState({
			status: 'error',
			error: error instanceof Error ? error.message : 'Failed to setup keys'
		});
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

	updateState({ status: 'unlocking', error: null });

	try {
		updateState({ storedKeys: keys });
		decryptedKeys = unlockWithPassword(password, keys);

		updateState({ unlocked: true, status: 'unlocked' });
		resetSessionTimeout();
		persistSessionKeys().catch(() => {}); // Best effort persistence
	} catch (error) {
		updateState({
			status: 'error',
			error: error instanceof Error ? error.message : 'Failed to unlock. Check your password.'
		});
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

	updateState({ status: 'unlocking', error: null });

	try {
		const recoveryKey = mnemonicToRecoveryKey(mnemonic);
		decryptedKeys = unlockWithRecoveryKey(recoveryKey, keys);
		secureZero(recoveryKey);

		updateState({ storedKeys: keys, unlocked: true, status: 'unlocked' });
		resetSessionTimeout();
		persistSessionKeys().catch(() => {}); // Best effort persistence
	} catch (error) {
		updateState({
			status: 'error',
			error: 'Invalid recovery phrase'
		});
		throw error;
	}
}

// ============================================
// Direct Key Setting (for sharding flow)
// ============================================

/**
 * Set decrypted keys directly (for sharding-based unlock)
 * Use this when unlocking via key sharding instead of password
 */
export function setDecryptedKeys(keys: {
	masterKey: Uint8Array;
	privateKey: Uint8Array;
	publicKey: Uint8Array;
}): void {
	if (!isE2EEReady()) {
		throw new Error('E2EE not initialized');
	}

	decryptedKeys = {
		masterKey: keys.masterKey,
		privateKey: keys.privateKey,
		publicKey: keys.publicKey
	};

	updateState({ unlocked: true, status: 'unlocked' });
	resetSessionTimeout();
	persistSessionKeys().catch(() => {}); // Best effort persistence
}

/**
 * Alias for setDecryptedKeys for simpler API
 */
export function setMasterKey(masterKey: Uint8Array): void {
	if (decryptedKeys) {
		decryptedKeys.masterKey = masterKey;
	} else {
		throw new Error('Cannot set master key without key pair. Use setDecryptedKeys instead.');
	}
}

/**
 * Set key pair (for use with sharding)
 */
export function setKeyPair(publicKey: Uint8Array, privateKey: Uint8Array): void {
	if (decryptedKeys) {
		decryptedKeys.publicKey = publicKey;
		decryptedKeys.privateKey = privateKey;
	} else {
		// Initialize with new keys
		decryptedKeys = {
			masterKey: new Uint8Array(32), // Placeholder - should be set with setDecryptedKeys
			publicKey,
			privateKey
		};
	}
}

// ============================================
// Key Access (must be unlocked)
// ============================================

export function getMasterKey(): Uint8Array {
	// Clear timeout BEFORE the check to prevent race condition
	clearSessionTimeout();

	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}

	// Capture key reference before resetting timeout
	const key = decryptedKeys.masterKey;
	resetSessionTimeout();
	return key;
}

/**
 * Get the decrypted master key if available, or null if locked
 * Use this for optional access (e.g., checking if we can register a passkey)
 */
export function getDecryptedMasterKey(): Uint8Array | null {
	if (!decryptedKeys) {
		return null;
	}
	resetSessionTimeout();
	return decryptedKeys.masterKey;
}

export function getPrivateKey(): Uint8Array {
	// Clear timeout BEFORE the check to prevent race condition
	clearSessionTimeout();

	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}

	// Capture key reference before resetting timeout
	const key = decryptedKeys.privateKey;
	resetSessionTimeout();
	return key;
}

export function getPublicKey(): Uint8Array {
	// Clear timeout BEFORE the check to prevent race condition
	clearSessionTimeout();

	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}

	// Capture key reference before resetting timeout
	const key = decryptedKeys.publicKey;
	resetSessionTimeout();
	return key;
}

export function isUnlocked(): boolean {
	return decryptedKeys !== null;
}

// ============================================
// Password Change
// ============================================

export async function changeUserPassword(
	newPassword: string
): Promise<{ encryptedMasterKey: EncryptedData; kekParams: { salt: string; opsLimit: number; memLimit: number } }> {
	if (!decryptedKeys) {
		throw new Error('E2EE locked. Please unlock first.');
	}

	const result = await changePassword(decryptedKeys.masterKey, newPassword);
	console.log('🔑 Password changed successfully');
	return result;
}

// ============================================
// Recovery Mnemonic Access
// ============================================

export async function getRecoveryMnemonic(
	password: string,
	keys: StorableUserKeys
): Promise<string> {
	if (!isE2EEReady()) {
		throw new Error('E2EE not initialized');
	}

	if (!isUnlocked()) {
		throw new Error('E2EE must be unlocked to view recovery phrase');
	}

	// Verify password
	const kek = deriveKEKWithParams(password, {
		salt: keys.kekSalt,
		opsLimit: keys.kekOpsLimit,
		memLimit: keys.kekMemLimit
	});

	try {
		const encryptedMasterKey: EncryptedData = {
			ciphertext: keys.encryptedMasterKey,
			nonce: keys.masterKeyNonce
		};
		const verifiedMasterKey = decryptSecretBox(encryptedMasterKey, kek);
		secureZero(verifiedMasterKey);
	} catch {
		secureZero(kek);
		throw new Error('Incorrect password');
	}

	secureZero(kek);

	// Decrypt recovery key
	const masterKey = getMasterKey();
	const encryptedRecoveryKey: EncryptedData = {
		ciphertext: keys.encryptedRecoveryKey,
		nonce: keys.recoveryKeyNonce
	};

	const recoveryKey = decryptSecretBox(encryptedRecoveryKey, masterKey);
	const mnemonic = recoveryKeyToMnemonic(recoveryKey);
	secureZero(recoveryKey);

	return mnemonic;
}

// ============================================
// Lock / Session Management
// ============================================

export async function lock(clearPersisted: boolean = true): Promise<void> {
	if (decryptedKeys) {
		secureZero(decryptedKeys.masterKey);
		secureZero(decryptedKeys.privateKey);
		secureZero(decryptedKeys.publicKey);
		decryptedKeys = null;
	}

	clearChatKeyCache();
	clearCredentialsKeyCache();

	if (clearPersisted) {
		await clearPersistedSession();
	}

	updateState({ unlocked: false, status: 'locked' });
	clearSessionTimeout();
}

export async function lockE2EE(): Promise<void> {
	await lock(true);
}

function resetSessionTimeout(): void {
	clearSessionTimeout();
	sessionTimeoutId = setTimeout(async () => {
		await lock();
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
// Session Persistence (Secure IndexedDB with non-extractable keys)
// ============================================

// Legacy localStorage keys for migration (will be removed in future)
const LEGACY_LOCAL_STORAGE_KEYS = {
	encryptedMasterKey: 'e2ee_session_master_key',
	masterKeyNonce: 'e2ee_session_master_key_nonce',
	encryptedPrivateKey: 'e2ee_session_private_key',
	privateKeyNonce: 'e2ee_session_private_key_nonce',
	publicKey: 'e2ee_session_public_key'
};
const LEGACY_SESSION_KEY_STORAGE = 'e2ee_session_key';

/**
 * Persist session keys using non-extractable Web Crypto keys in IndexedDB
 * This is more secure than localStorage as keys cannot be extracted via XSS
 */
async function persistSessionKeys(): Promise<void> {
	if (!decryptedKeys) {
		return;
	}

	try {
		// Use the new secure session with non-extractable keys
		await createSecureSession(
			decryptedKeys.masterKey,
			decryptedKeys.privateKey,
			decryptedKeys.publicKey,
			securitySettings.sessionTimeoutMs
		);
	} catch (error) {
		console.error('Failed to persist session keys:', error);
	}
}

/**
 * Clear persisted session data
 */
async function clearPersistedSession(): Promise<void> {
	try {
		await clearSecureSession();
	} catch (error) {
		console.error('Failed to clear secure session:', error);
	}

	// Also clear legacy storage for migration
	if (typeof localStorage !== 'undefined') {
		Object.values(LEGACY_LOCAL_STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
	}
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(LEGACY_SESSION_KEY_STORAGE);
	}
}

/**
 * Try to restore session from secure IndexedDB storage
 */
export async function tryRestoreSession(): Promise<boolean> {
	try {
		// First try the new secure session
		const hasSecure = await hasValidSecureSession();
		if (hasSecure) {
			const restored = await restoreSecureSession();
			if (restored) {
				if (!isSodiumReady()) {
					await initSodium();
				}

				decryptedKeys = {
					masterKey: restored.masterKey,
					privateKey: restored.privateKey,
					publicKey: restored.publicKey
				};
				updateState({ unlocked: true, status: 'unlocked' });
				resetSessionTimeout();

				return true;
			}
		}

		// Fall back to legacy localStorage/sessionStorage for migration
		return await tryRestoreLegacySession();
	} catch (error) {
		console.error('Failed to restore session:', error);
		await clearPersistedSession();
		return false;
	}
}

/**
 * Try to restore from legacy localStorage/sessionStorage
 * This is for backwards compatibility during migration
 */
async function tryRestoreLegacySession(): Promise<boolean> {
	if (typeof localStorage === 'undefined' || typeof sessionStorage === 'undefined') {
		return false;
	}

	try {
		const sessionKeyBase64 = sessionStorage.getItem(LEGACY_SESSION_KEY_STORAGE);
		if (!sessionKeyBase64) {
			return false;
		}

		const encryptedMasterKey = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.encryptedMasterKey);
		const masterKeyNonce = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.masterKeyNonce);
		const encryptedPrivateKey = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.encryptedPrivateKey);
		const privateKeyNonce = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.privateKeyNonce);
		const publicKeyBase64 = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.publicKey);

		if (!encryptedMasterKey || !masterKeyNonce || !encryptedPrivateKey || !privateKeyNonce || !publicKeyBase64) {
			clearLegacySession();
			return false;
		}

		if (!isSodiumReady()) {
			await initSodium();
		}

		const sessionKey = fromBase64(sessionKeyBase64);
		const masterKey = decryptSecretBox({ ciphertext: encryptedMasterKey, nonce: masterKeyNonce }, sessionKey);
		const privateKey = decryptSecretBox({ ciphertext: encryptedPrivateKey, nonce: privateKeyNonce }, sessionKey);
		const publicKey = fromBase64(publicKeyBase64);

		secureZero(sessionKey);

		decryptedKeys = { masterKey, privateKey, publicKey };
		updateState({ unlocked: true, status: 'unlocked' });
		resetSessionTimeout();

		// Migrate to new secure session
		await persistSessionKeys();

		// Clear legacy storage after successful migration
		clearLegacySession();

		return true;
	} catch (error) {
		console.error('Failed to restore legacy session:', error);
		clearLegacySession();
		return false;
	}
}

/**
 * Clear legacy session storage
 */
function clearLegacySession(): void {
	if (typeof localStorage !== 'undefined') {
		Object.values(LEGACY_LOCAL_STORAGE_KEYS).forEach((key) => {
			localStorage.removeItem(key);
		});
	}
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(LEGACY_SESSION_KEY_STORAGE);
	}
}

export function hasActiveSession(): boolean {
	// Check for legacy session storage first (for backwards compatibility)
	if (typeof sessionStorage !== 'undefined' && typeof localStorage !== 'undefined') {
		const hasLegacySessionKey = sessionStorage.getItem(LEGACY_SESSION_KEY_STORAGE) !== null;
		const hasLegacyEncryptedData = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEYS.encryptedMasterKey) !== null;
		if (hasLegacySessionKey && hasLegacyEncryptedData) {
			return true;
		}
	}

	// Check in-memory state (secure session check is async, so we can't use it here)
	return decryptedKeys !== null;
}

/**
 * Check if there's a valid secure session (async version)
 */
export async function hasActiveSecureSession(): Promise<boolean> {
	// Check in-memory first
	if (decryptedKeys !== null) {
		return true;
	}

	// Check IndexedDB secure session
	return hasValidSecureSession();
}

export async function clearSession(): Promise<void> {
	await lock(true);
}

// ============================================
// Browser Event Handlers
// ============================================

if (typeof window !== 'undefined') {
	window.addEventListener('pagehide', () => {
		// Use non-async version for pagehide (can't await in event handler)
		if (decryptedKeys) {
			secureZero(decryptedKeys.masterKey);
			secureZero(decryptedKeys.privateKey);
			decryptedKeys = null;
		}
		clearChatKeyCache();
		clearCredentialsKeyCache();
		updateState({ unlocked: false, status: 'locked' });
		clearSessionTimeout();

		// Clear persisted session async (best effort)
		if (securitySettings.strictSessionLocking) {
			clearPersistedSession().catch(() => {});
		}
	});

	['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
		window.addEventListener(event, extendSession, { passive: true });
	});
}
