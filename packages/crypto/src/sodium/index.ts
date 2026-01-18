/**
 * Sodium Crypto Module - Main Entry Point
 */

// Initialization
export { initializeSodium, initSodium, getSodium, isSodiumReady, type Sodium } from './init';

// Utilities
export {
	toBase64,
	fromBase64,
	toHex,
	fromHex,
	toBytes,
	fromBytes,
	secureCompare,
	randomBytes,
	secureZero,
	type EncryptedData,
	type EncryptedDataWithSalt
} from './utils';

// Symmetric encryption
export {
	generateSecretKey,
	encryptSecretBox,
	decryptSecretBox,
	encryptString,
	decryptString,
	encryptJSON,
	decryptJSON,
	encryptKey,
	decryptKey
} from './symmetric';

// Key derivation (Argon2id)
export {
	generateSalt,
	deriveKEK,
	deriveKEKWithFallback,
	deriveKEKWithParams,
	getDefaultArgon2Params,
	getFallbackArgon2Params,
	type Argon2Params
} from './keyEncryption';

// Asymmetric encryption
export {
	generateKeyPair,
	serializeKeyPair,
	deserializeKeyPair,
	sealedBoxEncrypt,
	sealedBoxDecrypt,
	encryptKeyForRecipient,
	decryptSharedKey,
	encryptAuthToken,
	decryptAuthToken,
	type KeyPair,
	type SerializedKeyPair
} from './asymmetric';

// Master key management
export {
	generateUserKeyBundle,
	keyBundleToStorable,
	unlockWithPassword,
	unlockWithRecoveryKey,
	getRecoveryKey,
	changePassword,
	type UserKeyBundle,
	type StorableUserKeys,
	type DecryptedUserKeys
} from './masterKey';

// Recovery key (BIP39)
export {
	recoveryKeyToMnemonic,
	mnemonicToRecoveryKey,
	validateMnemonic,
	formatMnemonicForDisplay,
	generateVerificationId,
	formatVerificationIdForDisplay,
	createRecoveryKeyInfo,
	type RecoveryKeyInfo
} from './recoveryKey';

// Key Manager (session management)
export {
	e2eeReady,
	e2eeStatus,
	e2eeUnlocked,
	e2eeError,
	storedUserKeys,
	initializeE2EE,
	isE2EEReady,
	setupUserKeys,
	unlockWithPasswordFlow,
	unlockWithRecoveryMnemonic,
	getMasterKey,
	getPrivateKey,
	getPublicKey,
	isUnlocked,
	changeUserPassword,
	lock,
	lockE2EE,
	extendSession,
	hasActiveSession,
	hasActiveSecureSession,
	tryRestoreSession,
	clearSession,
	getRecoveryMnemonic,
	updateE2EESecuritySettings,
	getE2EESecuritySettings,
	isStrictSessionLockingEnabled,
	subscribe,
	getState,
	setDecryptedKeys,
	setMasterKey,
	setKeyPair,
	type E2EESecuritySettings,
	type E2EEState,
	type E2EEStatusType
} from './keyManager';

// Secure Session (non-extractable keys)
export * from '../session';

// Chat encryption
export {
	createEncryptedChat,
	getChatKey,
	decryptChat,
	updateEncryptedChat,
	encryptChatContent,
	encryptChatTitle,
	decryptChatTitle,
	decryptChatContent,
	clearChatKeyCache,
	isChatEncrypted,
	type EncryptedChatData,
	type DecryptedChatData
} from './chatEncryption';

// Sharing
export {
	encryptChatKeyForRecipient,
	decryptReceivedChatKey,
	getVerificationIdForKey,
	getOwnVerificationId,
	getOwnVerificationId as getVerificationId
} from './sharing';

// Credentials encryption
export {
	encryptCredential,
	decryptCredential,
	decryptCredentials,
	generateOrgCredentialsKey,
	encryptOrgCredentialsKeyForUser,
	decryptOrgCredentialsKey,
	encryptCredentialWithOrgKey,
	decryptCredentialWithOrgKey,
	clearCredentialsKeyCache,
	type LLMCredential,
	type EncryptedCredentialData
} from './credentialsEncryption';

// Notes encryption
export {
	encryptNoteTitle,
	decryptNoteTitle,
	encryptNoteContent,
	decryptNoteContent,
	encryptNote,
	decryptNote,
	type EncryptedNoteData
} from './notesEncryption';

// Key Sharding (re-export for convenience)
export * from '../sharding';
