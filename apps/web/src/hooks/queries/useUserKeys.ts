import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';

/**
 * Check if user has E2EE keys set up
 */
export function useUserKeysCheck() {
  return useQuery(api.userKeys.check);
}

/**
 * Get user's E2EE key material
 */
export function useUserKeys() {
  return useQuery(api.userKeys.get);
}

/**
 * Create user E2EE keys
 */
export function useCreateUserKeys() {
  const createUserKeys = useMutation(api.userKeys.create);

  return {
    mutateAsync: async (data: {
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
    }) => {
      return createUserKeys(data);
    },
    mutate: (data: {
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
    }) => {
      createUserKeys(data);
    },
  };
}

/**
 * Update user E2EE keys (for password change)
 */
export function useUpdateUserKeys() {
  const updateUserKeys = useMutation(api.userKeys.update);

  return {
    mutateAsync: async (data: {
      kekSalt?: string;
      kekOpsLimit?: number;
      kekMemLimit?: number;
      encryptedMasterKey?: string;
      masterKeyNonce?: string;
    }) => {
      return updateUserKeys(data);
    },
    mutate: (data: {
      kekSalt?: string;
      kekOpsLimit?: number;
      kekMemLimit?: number;
      encryptedMasterKey?: string;
      masterKeyNonce?: string;
    }) => {
      updateUserKeys(data);
    },
  };
}
