import { trpc } from "@/lib/trpc";

/**
 * Get list of registered devices for the current user
 */
export function useDevices() {
  const query = trpc.devices.list.useQuery();
  return {
    devices: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Revoke a device
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
