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
 * Get user's key shares (Privy-style server-protected)
 * The auth share is returned as plaintext - security comes from Clerk authentication
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
 * Update auth share (for share rotation)
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

/**
 * Register a device and get its secret
 * The device secret is used as server-side entropy for device share encryption
 */
export function useRegisterDevice() {
  const utils = trpc.useUtils();
  const mutation = trpc.devices.register.useMutation({
    onSuccess: () => {
      utils.devices.list.invalidate();
    },
  });

  return mutation;
}

/**
 * Get device secret for the current device
 */
export function useDeviceSecret(deviceId: string | null, enabled = true) {
  const query = trpc.devices.getDeviceSecret.useQuery(
    { deviceId: deviceId || "" },
    {
      enabled: enabled && !!deviceId,
      retry: false,
    }
  );
  return query.data;
}

/**
 * List all registered devices
 */
export function useDevicesList() {
  return trpc.devices.list.useQuery();
}

/**
 * Revoke a device (mark as untrusted)
 */
export function useRevokeDevice() {
  const utils = trpc.useUtils();
  const mutation = trpc.devices.revoke.useMutation({
    onSuccess: () => {
      utils.devices.list.invalidate();
    },
  });

  return mutation;
}

/**
 * Delete a device
 */
export function useDeleteDevice() {
  const utils = trpc.useUtils();
  const mutation = trpc.devices.delete.useMutation({
    onSuccess: () => {
      utils.devices.list.invalidate();
    },
  });

  return mutation;
}
