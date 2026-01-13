import { trpc } from "@/lib/trpc";

/**
 * Check if user has E2EE keys set up
 */
export function useUserKeysCheck() {
  const query = trpc.userKeys.check.useQuery();
  return query.data;
}

/**
 * Get user's E2EE key material
 */
export function useUserKeys() {
  const query = trpc.userKeys.get.useQuery(undefined, {
    retry: false,
  });
  return query.data;
}

/**
 * Create user E2EE keys
 */
export function useCreateUserKeys() {
  const utils = trpc.useUtils();
  const mutation = trpc.userKeys.create.useMutation({
    onSuccess: () => {
      utils.userKeys.check.invalidate();
      utils.userKeys.get.invalidate();
    },
  });

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
      return mutation.mutateAsync(data);
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
      mutation.mutate(data);
    },
  };
}

/**
 * Update user E2EE keys (for password change)
 */
export function useUpdateUserKeys() {
  const utils = trpc.useUtils();
  const mutation = trpc.userKeys.update.useMutation({
    onSuccess: () => {
      utils.userKeys.get.invalidate();
    },
  });

  return {
    mutateAsync: async (data: {
      kekSalt?: string;
      kekOpsLimit?: number;
      kekMemLimit?: number;
      encryptedMasterKey?: string;
      masterKeyNonce?: string;
    }) => {
      return mutation.mutateAsync(data);
    },
    mutate: (data: {
      kekSalt?: string;
      kekOpsLimit?: number;
      kekMemLimit?: number;
      encryptedMasterKey?: string;
      masterKeyNonce?: string;
    }) => {
      mutation.mutate(data);
    },
  };
}
