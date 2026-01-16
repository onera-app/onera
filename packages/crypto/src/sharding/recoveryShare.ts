/**
 * Recovery Share Module
 * Manages the recovery share encrypted with the recovery key (derived from mnemonic)
 *
 * The recovery share allows account recovery when:
 * - Device is lost (no device share)
 * - Need to add a new device
 */

import { secureZero, type EncryptedData } from '../sodium/utils';
import { encryptShare, decryptShare } from './shareManager';
import {
  mnemonicToRecoveryKey,
  createRecoveryKeyInfo,
  type RecoveryKeyInfo,
} from '../sodium/recoveryKey';
import { generateSecretKey } from '../sodium/symmetric';

/**
 * Stored recovery share format (for database storage)
 */
export interface StoredRecoveryShare {
  version: 1;
  encrypted: string;
  nonce: string;
  createdAt: number;
}

/**
 * Encrypt the recovery share with a recovery key
 */
export function encryptRecoveryShareWithKey(
  recoveryShare: Uint8Array,
  recoveryKey: Uint8Array
): StoredRecoveryShare {
  const encrypted = encryptShare(recoveryShare, recoveryKey);

  return {
    version: 1,
    encrypted: encrypted.ciphertext,
    nonce: encrypted.nonce,
    createdAt: Date.now(),
  };
}

/**
 * Decrypt the recovery share using the recovery key
 */
export function decryptRecoveryShareWithKey(
  stored: StoredRecoveryShare,
  recoveryKey: Uint8Array
): Uint8Array {
  if (stored.version !== 1) {
    throw new Error(`Unknown recovery share version: ${stored.version}`);
  }

  const encrypted: EncryptedData = {
    ciphertext: stored.encrypted,
    nonce: stored.nonce,
  };

  return decryptShare(encrypted, recoveryKey);
}

/**
 * Encrypt the recovery share using a mnemonic phrase
 * Convenience function that derives the recovery key from the mnemonic
 */
export function encryptRecoveryShareWithMnemonic(
  recoveryShare: Uint8Array,
  mnemonic: string
): StoredRecoveryShare {
  const recoveryKey = mnemonicToRecoveryKey(mnemonic);

  try {
    return encryptRecoveryShareWithKey(recoveryShare, recoveryKey);
  } finally {
    secureZero(recoveryKey);
  }
}

/**
 * Decrypt the recovery share using a mnemonic phrase
 * Convenience function that derives the recovery key from the mnemonic
 */
export function decryptRecoveryShareWithMnemonic(
  stored: StoredRecoveryShare,
  mnemonic: string
): Uint8Array {
  const recoveryKey = mnemonicToRecoveryKey(mnemonic);

  try {
    return decryptRecoveryShareWithKey(stored, recoveryKey);
  } finally {
    secureZero(recoveryKey);
  }
}

/**
 * Generate a new recovery key and create recovery info for display
 * Returns both the recovery key (for encrypting the share) and
 * the info to show to the user (mnemonic phrase)
 */
export function generateRecoveryKeyAndInfo(): {
  recoveryKey: Uint8Array;
  recoveryInfo: RecoveryKeyInfo;
} {
  const recoveryKey = generateSecretKey();
  const recoveryInfo = createRecoveryKeyInfo(recoveryKey);

  return {
    recoveryKey,
    recoveryInfo,
  };
}

/**
 * Validate that stored recovery share data is well-formed
 */
export function isValidStoredRecoveryShare(data: unknown): data is StoredRecoveryShare {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    obj.version === 1 &&
    typeof obj.encrypted === 'string' &&
    typeof obj.nonce === 'string' &&
    typeof obj.createdAt === 'number'
  );
}

/**
 * Convert stored recovery share to base64 strings for API transmission
 */
export function serializeStoredRecoveryShare(stored: StoredRecoveryShare): {
  encryptedRecoveryShare: string;
  recoveryShareNonce: string;
} {
  return {
    encryptedRecoveryShare: stored.encrypted,
    recoveryShareNonce: stored.nonce,
  };
}

/**
 * Convert API response to StoredRecoveryShare format
 */
export function deserializeStoredRecoveryShare(data: {
  encryptedRecoveryShare: string;
  recoveryShareNonce: string;
}): StoredRecoveryShare {
  return {
    version: 1,
    encrypted: data.encryptedRecoveryShare,
    nonce: data.recoveryShareNonce,
    createdAt: 0, // Unknown from API response
  };
}
