/**
 * Password-based Key Derivation Module
 *
 * Provides Argon2id-based key derivation for encrypting master keys
 * with user passwords.
 */

export {
  derivePasswordKEK,
  encryptMasterKeyWithPassword,
  decryptMasterKeyWithPassword,
  verifyPassword,
  generatePasswordSalt,
  getDefaultArgon2idParams,
  getInteractiveArgon2idParams,
  getSensitiveArgon2idParams,
  type Argon2idParams,
  type PasswordEncryptedMasterKey,
} from "./passwordDerivation";
