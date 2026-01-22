import { trpc } from "@/lib/trpc";
import { decryptDeviceName, isUnlocked } from "@onera/crypto";
import { useMemo } from "react";

/**
 * Device with decrypted name
 */
interface DecryptedDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string | null; // Decrypted name
  userAgent: string | null;
  trusted: boolean;
  lastSeenAt: Date | string;
  createdAt: Date | string;
}

/**
 * Get list of registered devices for the current user
 * Device names are decrypted client-side
 */
export function useDevices() {
  const query = trpc.devices.list.useQuery();

  // Decrypt device names client-side
  const devices = useMemo<DecryptedDevice[] | undefined>(() => {
    if (!query.data) return undefined;

    return query.data.map((device) => {
      let deviceName: string | null = null;

      // Decrypt device name (plaintext columns have been dropped)
      if (device.encryptedDeviceName && device.deviceNameNonce && isUnlocked()) {
        try {
          deviceName = decryptDeviceName(device.encryptedDeviceName, device.deviceNameNonce);
        } catch (error) {
          console.error('Failed to decrypt device name:', error);
          deviceName = null;
        }
      }

      return {
        id: device.id,
        userId: device.userId,
        deviceId: device.deviceId,
        deviceName,
        userAgent: device.userAgent,
        trusted: device.trusted,
        lastSeenAt: device.lastSeenAt,
        createdAt: device.createdAt,
      };
    });
  }, [query.data]);

  return {
    devices,
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
