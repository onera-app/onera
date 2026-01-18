/**
 * WebAuthn Crypto Module
 *
 * Provides PRF-based key derivation for passkey-protected E2EE.
 */

export {
  // PRF Support
  checkWebAuthnPRFSupport,
  type PRFSupportResult,
  // PRF Key Derivation
  generatePRFSalt,
  derivePRFKEK,
  // Master Key Encryption
  encryptMasterKeyWithPRF,
  decryptMasterKeyWithPRF,
  type PRFEncryptedMasterKey,
  // Extension Helpers
  extractPRFOutput,
  createPRFExtensionInputs,
  createPRFRegistrationInputs,
} from "./prfDerivation";
