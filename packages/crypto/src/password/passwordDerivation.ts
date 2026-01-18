/**
 * Password-based Key Derivation Module
 *
 * Uses Argon2id (via libsodium) to derive a Key Encryption Key (KEK)
 * from a user's password. This KEK then encrypts the master key.
 *
 * Security properties:
 * - Argon2id is memory-hard, resistant to GPU/ASIC attacks
 * - Configurable memory and CPU cost parameters
 * - Random salt prevents rainbow table attacks
 * - KEK never stored, derived on-demand from password
 */

import { getSodium } from "../sodium/init";
import {
  toBase64,
  fromBase64,
  randomBytes,
  type EncryptedData,
} from "../sodium/utils";

const KEK_BYTES = 32;
const SALT_BYTES = 16; // crypto_pwhash_SALTBYTES

/**
 * Argon2id parameters for key derivation
 * These can be tuned based on security requirements and device capabilities
 */
export interface Argon2idParams {
  /** Operations limit (CPU cost) */
  opsLimit: number;
  /** Memory limit in bytes */
  memLimit: number;
}

/**
 * Default Argon2id parameters
 * Using MODERATE for balance of security and performance
 */
export function getDefaultArgon2idParams(): Argon2idParams {
  const sodium = getSodium();
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_MODERATE,
  };
}

/**
 * Interactive (faster) Argon2id parameters
 * Use for scenarios where quick response is needed
 */
export function getInteractiveArgon2idParams(): Argon2idParams {
  const sodium = getSodium();
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  };
}

/**
 * Sensitive (slower, more secure) Argon2id parameters
 * Use for high-security scenarios
 */
export function getSensitiveArgon2idParams(): Argon2idParams {
  const sodium = getSodium();
  return {
    opsLimit: sodium.crypto_pwhash_OPSLIMIT_SENSITIVE,
    memLimit: sodium.crypto_pwhash_MEMLIMIT_SENSITIVE,
  };
}

/**
 * Encrypted master key with password derivation metadata
 */
export interface PasswordEncryptedMasterKey extends EncryptedData {
  /** Salt used for Argon2id key derivation */
  salt: string;
  /** Argon2id operations limit used */
  opsLimit: number;
  /** Argon2id memory limit used */
  memLimit: number;
}

/**
 * Generate a random salt for password-based key derivation
 * @returns Base64-encoded salt
 */
export function generatePasswordSalt(): string {
  return toBase64(randomBytes(SALT_BYTES));
}

/**
 * Derive a Key Encryption Key (KEK) from a password using Argon2id
 *
 * @param password - The user's password
 * @param salt - Base64-encoded salt
 * @param params - Argon2id parameters (opsLimit, memLimit)
 * @returns The derived KEK (32 bytes)
 */
export async function derivePasswordKEK(
  password: string,
  salt: string,
  params: Argon2idParams
): Promise<Uint8Array> {
  const sodium = getSodium();
  const saltBytes = fromBase64(salt);

  // Derive KEK using Argon2id
  const kek = sodium.crypto_pwhash(
    KEK_BYTES,
    password,
    saltBytes,
    params.opsLimit,
    params.memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  return kek;
}

/**
 * Encrypt master key with a password-derived KEK
 *
 * @param masterKey - The master key to encrypt
 * @param password - The user's password
 * @param params - Optional Argon2id parameters (defaults to MODERATE)
 * @returns Encrypted master key with derivation metadata
 */
export async function encryptMasterKeyWithPassword(
  masterKey: Uint8Array,
  password: string,
  params?: Argon2idParams
): Promise<PasswordEncryptedMasterKey> {
  const sodium = getSodium();
  const derivationParams = params ?? getDefaultArgon2idParams();

  // Generate random salt
  const salt = generatePasswordSalt();

  // Derive KEK from password
  const kek = await derivePasswordKEK(password, salt, derivationParams);

  // Encrypt master key with KEK using XSalsa20-Poly1305
  const nonce = randomBytes(24);
  const ciphertext = sodium.crypto_secretbox_easy(masterKey, nonce, kek);

  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(nonce),
    salt,
    opsLimit: derivationParams.opsLimit,
    memLimit: derivationParams.memLimit,
  };
}

/**
 * Decrypt master key with a password-derived KEK
 *
 * @param encrypted - The encrypted master key data with derivation params
 * @param password - The user's password
 * @returns The decrypted master key
 * @throws Error if decryption fails (wrong password or tampered data)
 */
export async function decryptMasterKeyWithPassword(
  encrypted: PasswordEncryptedMasterKey,
  password: string
): Promise<Uint8Array> {
  const sodium = getSodium();

  // Derive KEK from password using stored parameters
  const kek = await derivePasswordKEK(password, encrypted.salt, {
    opsLimit: encrypted.opsLimit,
    memLimit: encrypted.memLimit,
  });

  // Decrypt master key
  const ciphertext = fromBase64(encrypted.ciphertext);
  const nonce = fromBase64(encrypted.nonce);

  const masterKey = sodium.crypto_secretbox_open_easy(ciphertext, nonce, kek);

  if (!masterKey) {
    throw new Error(
      "Failed to decrypt master key: incorrect password or tampered data"
    );
  }

  return masterKey;
}

/**
 * Verify a password against stored encrypted data without fully decrypting
 * This is useful for password validation before expensive operations
 *
 * @param encrypted - The encrypted master key data
 * @param password - The password to verify
 * @returns True if password is correct, false otherwise
 */
export async function verifyPassword(
  encrypted: PasswordEncryptedMasterKey,
  password: string
): Promise<boolean> {
  try {
    await decryptMasterKeyWithPassword(encrypted, password);
    return true;
  } catch {
    return false;
  }
}
