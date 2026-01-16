import { trpc } from "@/lib/trpc";

/**
 * Check if user has key shares set up (for E2EE)
 */
export function useKeySharesCheck(enabled = true) {
  const query = trpc.keyShares.check.useQuery(undefined, {
    enabled,
    retry: false,
  });
  return query.data;
}

/**
 * Get user's key shares
 */
export function useKeyShares() {
  const query = trpc.keyShares.get.useQuery(undefined, {
    retry: false,
  });
  return query.data;
}

/**
 * Create user key shares
 */
export function useCreateKeyShares() {
  const utils = trpc.useUtils();
  const mutation = trpc.keyShares.create.useMutation({
    onSuccess: () => {
      utils.keyShares.check.invalidate();
      utils.keyShares.get.invalidate();
    },
  });

  return mutation;
}

/**
 * Update auth share
 */
export function useUpdateAuthShare() {
  const utils = trpc.useUtils();
  const mutation = trpc.keyShares.updateAuthShare.useMutation({
    onSuccess: () => {
      utils.keyShares.get.invalidate();
    },
  });

  return mutation;
}

/**
 * Update recovery share
 */
export function useUpdateRecoveryShare() {
  const utils = trpc.useUtils();
  const mutation = trpc.keyShares.updateRecoveryShare.useMutation({
    onSuccess: () => {
      utils.keyShares.get.invalidate();
    },
  });

  return mutation;
}
