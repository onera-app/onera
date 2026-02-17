import { useState } from 'react';
import { toast } from 'sonner';
import { useDevices, useRevokeDevice, useDeleteDevice } from '@/hooks/queries/useDevices';
import { getOrCreateDeviceId } from '@onera/crypto';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Tablet, Laptop, Loader2, Trash2, ShieldOff, ShieldCheck } from 'lucide-react';

interface Device {
  id: string;
  deviceId: string;
  deviceName: string | null;
  userAgent: string | null;
  trusted: boolean;
  lastSeenAt: Date | string;
  createdAt: Date | string;
}

function getDeviceIcon(userAgent: string | null) {
  if (!userAgent) return Monitor;

  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('android') && ua.includes('mobile')) {
    return Smartphone;
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return Tablet;
  }
  if (ua.includes('macbook') || ua.includes('laptop')) {
    return Laptop;
  }
  return Monitor;
}

function formatLastSeen(date: Date | string) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function DevicesTab() {
  const { devices, isLoading, error, refetch } = useDevices();
  const revokeDevice = useRevokeDevice();
  const deleteDevice = useDeleteDevice();
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [deviceToRevoke, setDeviceToRevoke] = useState<Device | null>(null);

  const currentDeviceId = getOrCreateDeviceId();

  const handleRevoke = async () => {
    if (!deviceToRevoke) return;

    try {
      await revokeDevice.mutateAsync({ deviceId: deviceToRevoke.deviceId });
      toast.success('Device access revoked');
      setDeviceToRevoke(null);
    } catch {
      toast.error('Failed to revoke device');
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;

    try {
      await deleteDevice.mutateAsync({ deviceId: deviceToDelete.deviceId });
      toast.success('Device removed');
      setDeviceToDelete(null);
    } catch {
      toast.error('Failed to remove device');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Devices</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage devices that have access to your encrypted data
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Registered Devices</Label>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive py-4">
            Failed to load devices. Please try again.
          </div>
        )}

        {devices && devices.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
            No devices registered.
          </div>
        )}

        {devices && devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((device: Device) => {
              const DeviceIcon = getDeviceIcon(device.userAgent);
              const isCurrentDevice = device.deviceId === currentDeviceId;

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-850"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-850">
                      <DeviceIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {device.deviceName || 'Unknown Device'}
                        </span>
                        {isCurrentDevice && (
                          <Badge variant="secondary" className="text-xs">
                            This device
                          </Badge>
                        )}
                        {device.trusted ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <ShieldOff className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last seen: {formatLastSeen(device.lastSeenAt)}
                      </div>
                    </div>
                  </div>

                  {!isCurrentDevice && (
                    <div className="flex items-center gap-2">
                      {device.trusted && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeviceToRevoke(device)}
                          disabled={revokeDevice.isPending}
                        >
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeviceToDelete(device)}
                        disabled={deleteDevice.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Revoking a device will require re-authentication with your recovery phrase to access your data from that device.
        </p>
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!deviceToRevoke} onOpenChange={() => setDeviceToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Device Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark "{deviceToRevoke?.deviceName || 'this device'}" as untrusted.
              The device will need to re-authenticate with your recovery phrase to access encrypted data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke}>
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deviceToDelete?.deviceName || 'this device'}" from your account.
              The device will need to set up encryption again to access your data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
