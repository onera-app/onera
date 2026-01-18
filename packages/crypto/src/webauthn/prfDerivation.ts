/**
 * WebAuthn PRF Key Derivation Module
 *
 * Uses the WebAuthn PRF (Pseudo-Random Function) extension to derive
 * a key encryption key (KEK) for encrypting the master key.
 *
 * Flow:
 * 1. Passkey authenticates with PRF extension enabled
 * 2. PRF returns a 32-byte device-bound secret
 * 3. HKDF derives the KEK from PRF output + salt
 * 4. KEK encrypts/decrypts the master key
 *
 * Security properties:
 * - PRF output is unique per credential (different passkeys = different KEKs)
 * - PRF output requires biometric/PIN verification on the device
 * - Salt adds domain separation and prevents rainbow table attacks
 * - HKDF provides key stretching and proper key derivation
 */

import { getSodium } from "../sodium/init";
import {
  toBase64,
  fromBase64,
  randomBytes,
  type EncryptedData,
} from "../sodium/utils";

const PRF_SALT_BYTES = 32;
const KEK_BYTES = 32;
const HKDF_INFO = "onera-webauthn-prf-kek-v1";

/**
 * Result of WebAuthn PRF support check
 */
export interface PRFSupportResult {
  /** WebAuthn API is available */
  webauthnAvailable: boolean;
  /** PRF extension is supported (requires browser support + authenticator support) */
  prfAvailable: boolean;
  /** Platform authenticator (Touch ID/Face ID) is available */
  platformAuthenticatorAvailable: boolean;
}

/**
 * Encrypted master key with PRF metadata
 */
export interface PRFEncryptedMasterKey extends EncryptedData {
  /** Salt used in HKDF for key derivation */
  prfSalt: string;
}

/**
 * Generate a random salt for PRF key derivation
 * @returns Base64-encoded salt
 */
export function generatePRFSalt(): string {
  return toBase64(randomBytes(PRF_SALT_BYTES));
}

/**
 * Derive a Key Encryption Key (KEK) from PRF output using HKDF-SHA256
 *
 * @param prfOutput - The PRF output from WebAuthn (32 bytes)
 * @param salt - The salt for HKDF (base64 encoded)
 * @returns The derived KEK (32 bytes)
 */
export async function derivePRFKEK(
  prfOutput: ArrayBuffer,
  salt: string
): Promise<Uint8Array> {
  const saltBytes = fromBase64(salt);
  const infoBytes = new TextEncoder().encode(HKDF_INFO);

  // Import PRF output as HKDF key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveBits"]
  );

  // Derive KEK using HKDF-SHA256
  const kekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: saltBytes.buffer.slice(
        saltBytes.byteOffset,
        saltBytes.byteOffset + saltBytes.byteLength
      ) as ArrayBuffer,
      info: infoBytes.buffer.slice(
        infoBytes.byteOffset,
        infoBytes.byteOffset + infoBytes.byteLength
      ) as ArrayBuffer,
    },
    keyMaterial,
    KEK_BYTES * 8
  );

  return new Uint8Array(kekBits);
}

/**
 * Encrypt master key with PRF-derived KEK
 *
 * @param masterKey - The master key to encrypt
 * @param prfOutput - The PRF output from WebAuthn authentication
 * @param salt - Optional salt (generated if not provided)
 * @returns Encrypted master key with PRF metadata
 */
export async function encryptMasterKeyWithPRF(
  masterKey: Uint8Array,
  prfOutput: ArrayBuffer,
  salt?: string
): Promise<PRFEncryptedMasterKey> {
  const sodium = getSodium();

  // Generate salt if not provided
  const prfSalt = salt ?? generatePRFSalt();

  // Derive KEK from PRF output
  const kek = await derivePRFKEK(prfOutput, prfSalt);

  // Encrypt master key with KEK using XSalsa20-Poly1305
  const nonce = randomBytes(24);
  const ciphertext = sodium.crypto_secretbox_easy(masterKey, nonce, kek);

  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(nonce),
    prfSalt,
  };
}

/**
 * Decrypt master key with PRF-derived KEK
 *
 * @param encrypted - The encrypted master key data
 * @param prfOutput - The PRF output from WebAuthn authentication
 * @returns The decrypted master key
 * @throws Error if decryption fails (wrong PRF output or tampered data)
 */
export async function decryptMasterKeyWithPRF(
  encrypted: PRFEncryptedMasterKey,
  prfOutput: ArrayBuffer
): Promise<Uint8Array> {
  const sodium = getSodium();

  // Derive KEK from PRF output
  const kek = await derivePRFKEK(prfOutput, encrypted.prfSalt);

  // Decrypt master key
  const ciphertext = fromBase64(encrypted.ciphertext);
  const nonce = fromBase64(encrypted.nonce);

  const masterKey = sodium.crypto_secretbox_open_easy(ciphertext, nonce, kek);

  if (!masterKey) {
    throw new Error(
      "Failed to decrypt master key: invalid PRF output or tampered data"
    );
  }

  return masterKey;
}

/**
 * Check if WebAuthn and PRF extension are supported
 *
 * Note: This is a basic check. Full PRF support requires the authenticator
 * to support the prf extension, which can only be confirmed during registration.
 *
 * @returns Object indicating support levels
 */
export async function checkWebAuthnPRFSupport(): Promise<PRFSupportResult> {
  const result: PRFSupportResult = {
    webauthnAvailable: false,
    prfAvailable: false,
    platformAuthenticatorAvailable: false,
  };

  // Check WebAuthn API availability
  if (
    typeof window === "undefined" ||
    !window.PublicKeyCredential ||
    !navigator.credentials
  ) {
    return result;
  }

  result.webauthnAvailable = true;

  // Check platform authenticator availability (Touch ID, Face ID, Windows Hello)
  try {
    const platformAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    result.platformAuthenticatorAvailable = platformAvailable;
  } catch {
    // Platform authenticator check not supported
    result.platformAuthenticatorAvailable = false;
  }

  // Check PRF extension support
  // This is a heuristic - full support can only be confirmed during registration
  // PRF is supported in Chrome 116+, Safari 18+, and modern Edge
  try {
    // Check if the browser supports conditional UI (a proxy for modern WebAuthn support)
    if ("isConditionalMediationAvailable" in PublicKeyCredential) {
      const conditionalAvailable =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (PublicKeyCredential as any).isConditionalMediationAvailable();
      // Browsers that support conditional mediation generally support PRF
      result.prfAvailable = conditionalAvailable;
    } else {
      // Fallback: assume PRF is available if platform authenticator is available
      // and we're on a modern browser (checked by WebAuthn availability)
      result.prfAvailable = result.platformAuthenticatorAvailable;
    }
  } catch {
    // Conservative fallback
    result.prfAvailable = result.platformAuthenticatorAvailable;
  }

  return result;
}

/**
 * Convert ArrayBuffer from PRF result to a format we can use
 * Handles both AuthenticationExtensionsClientOutputs.prf.results.first/second
 *
 * @param prfResults - The prf.results from WebAuthn extension output
 * @returns The PRF output as ArrayBuffer
 */
export function extractPRFOutput(prfResults: {
  first?: ArrayBuffer;
  second?: ArrayBuffer;
}): ArrayBuffer {
  // We use 'first' output by default (registered with eval: { first: salt })
  const output = prfResults.first;

  if (!output) {
    throw new Error("PRF output not available - authenticator may not support PRF extension");
  }

  // Verify output is expected size (32 bytes)
  if (output.byteLength !== 32) {
    throw new Error(
      `Unexpected PRF output size: ${output.byteLength} bytes (expected 32)`
    );
  }

  return output;
}

/**
 * Create PRF extension inputs for WebAuthn operations
 *
 * @param salt - Base64-encoded salt for PRF evaluation
 * @returns PRF extension input object for WebAuthn
 */
export function createPRFExtensionInputs(salt: string): {
  prf: { eval: { first: ArrayBuffer } };
} {
  const saltBytes = fromBase64(salt);

  return {
    prf: {
      eval: {
        first: saltBytes.buffer.slice(
          saltBytes.byteOffset,
          saltBytes.byteOffset + saltBytes.byteLength
        ) as ArrayBuffer,
      },
    },
  };
}

/**
 * Create PRF extension inputs for registration (evalByCredential not used during registration)
 *
 * @param salt - Base64-encoded salt for PRF evaluation
 * @returns PRF extension input object for registration
 */
export function createPRFRegistrationInputs(salt: string): {
  prf: { eval: { first: ArrayBuffer } };
} {
  // Same as authentication for initial registration
  return createPRFExtensionInputs(salt);
}
