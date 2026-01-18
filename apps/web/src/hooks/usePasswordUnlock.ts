/**
 * Password Unlock Hook
 *
 * Provides functions for setting up and unlocking encryption with a password.
 * Uses Argon2id for key derivation (memory-hard, resistant to GPU attacks).
 */

import { trpc } from "@/lib/trpc";
import {
  encryptMasterKeyWithPassword,
  decryptMasterKeyWithPassword,
  type PasswordEncryptedMasterKey,
} from "@onera/crypto/password";
import { getDecryptedMasterKey } from "@onera/crypto";

/**
 * Hook for checking if user has password encryption set up
 */
export function useHasPasswordEncryption(enabled = true) {
  const query = trpc.keyShares.hasPasswordEncryption.useQuery(undefined, {
    enabled,
    retry: false,
  });
  return {
    hasPassword: query.data?.hasPassword ?? false,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for setting up password-based encryption
 */
export function usePasswordSetup() {
  const utils = trpc.useUtils();
  const setPasswordMutation = trpc.keyShares.setPasswordEncryption.useMutation({
    onSuccess: () => {
      utils.keyShares.hasPasswordEncryption.invalidate();
    },
  });

  /**
   * Set up password-based encryption for the master key
   *
   * @param password - The password to use for encryption
   * @param masterKey - Optional master key (uses current session key if not provided)
   * @returns Success status
   * @throws Error if no master key available or encryption fails
   */
  async function setupPasswordEncryption(
    password: string,
    masterKey?: Uint8Array
  ): Promise<{ success: boolean }> {
    // Get master key from provided or from crypto module
    const key = masterKey ?? getDecryptedMasterKey();

    if (!key) {
      throw new Error(
        "Encryption must be unlocked before setting up password"
      );
    }

    // Encrypt master key with password
    const encrypted = await encryptMasterKeyWithPassword(key, password);

    // Store encrypted master key on server
    await setPasswordMutation.mutateAsync({
      encryptedMasterKey: encrypted.ciphertext,
      nonce: encrypted.nonce,
      salt: encrypted.salt,
      opsLimit: encrypted.opsLimit,
      memLimit: encrypted.memLimit,
    });

    return { success: true };
  }

  return {
    setupPasswordEncryption,
    isSettingUp: setPasswordMutation.isPending,
    error: setPasswordMutation.error,
  };
}

/**
 * Hook for unlocking encryption with password
 */
export function usePasswordUnlock() {
  const getPasswordEncryption = trpc.keyShares.getPasswordEncryption.useQuery(
    undefined,
    {
      enabled: false, // Manual fetch only
      retry: false,
    }
  );

  /**
   * Unlock encryption using password
   *
   * @param password - The user's password
   * @returns The decrypted master key
   * @throws Error if password is incorrect or decryption fails
   */
  async function unlockWithPassword(password: string): Promise<Uint8Array> {
    // Fetch encrypted master key from server
    const result = await getPasswordEncryption.refetch();

    if (!result.data) {
      throw new Error("Password encryption not set up for this account");
    }

    // Reconstruct encrypted data structure
    const encrypted: PasswordEncryptedMasterKey = {
      ciphertext: result.data.encryptedMasterKey,
      nonce: result.data.nonce,
      salt: result.data.salt,
      opsLimit: result.data.opsLimit,
      memLimit: result.data.memLimit,
    };

    // Decrypt master key with password
    const masterKey = await decryptMasterKeyWithPassword(encrypted, password);

    return masterKey;
  }

  return {
    unlockWithPassword,
    isUnlocking: getPasswordEncryption.isFetching,
    error: getPasswordEncryption.error,
  };
}

/**
 * Hook for removing password encryption
 */
export function useRemovePasswordEncryption() {
  const utils = trpc.useUtils();
  const mutation = trpc.keyShares.removePasswordEncryption.useMutation({
    onSuccess: () => {
      utils.keyShares.hasPasswordEncryption.invalidate();
    },
  });

  return mutation;
}
