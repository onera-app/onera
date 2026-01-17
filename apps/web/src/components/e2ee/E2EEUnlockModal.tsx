/**
 * E2EE Auto-Unlock Modal
 * Automatically unlocks E2EE using the user's Clerk ID (Shamir's secret)
 * If unlock fails, signs the user out to re-authenticate
 */

import { useEffect, useState, useRef } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useE2EEStore } from '@/stores/e2eeStore';
import {
  unlockWithLoginKey,
  setDecryptedKeys,
  getOrCreateDeviceId,
} from '@onera/crypto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function E2EEUnlockModal() {
  const { setStatus, setError } = useE2EEStore();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [unlockState, setUnlockState] = useState<'unlocking' | 'error'>('unlocking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  // Fetch key shares
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  // Update device last seen
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  useEffect(() => {
    async function autoUnlock() {
      // Prevent multiple attempts
      if (attemptedRef.current) return;

      // Wait for user and keyshares to load
      if (!user || keySharesQuery.isLoading) return;

      attemptedRef.current = true;
      setStatus('unlocking');

      // If no keyshares found, sign out
      if (!keySharesQuery.data) {
        console.error('No key shares found for user');
        setUnlockState('error');
        setErrorMessage('No encryption keys found. Please sign in again.');
        return;
      }

      try {
        const keyShares = keySharesQuery.data;

        // Unlock using the login key derived from user ID
        const decryptedKeys = unlockWithLoginKey(user.id, {
          encryptedMasterKeyForLogin: keyShares.encryptedMasterKeyForLogin,
          masterKeyForLoginNonce: keyShares.masterKeyForLoginNonce,
          encryptedPrivateKey: keyShares.encryptedPrivateKey,
          privateKeyNonce: keyShares.privateKeyNonce,
          publicKey: keyShares.publicKey,
        });

        // Set the decrypted keys in the crypto module
        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        // Update device last seen
        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

        setStatus('unlocked');
        toast.success('Welcome back!');
      } catch (err) {
        console.error('Auto-unlock failed:', err);
        const message = err instanceof Error ? err.message : 'Failed to unlock encryption';
        setError(message);
        setUnlockState('error');
        setErrorMessage(message);
      }
    }

    autoUnlock();
  }, [user, keySharesQuery.data, keySharesQuery.isLoading, setStatus, setError, updateLastSeenMutation]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  // Show error state with sign-out option
  if (unlockState === 'error') {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Unlock Failed
            </DialogTitle>
            <DialogDescription>
              {errorMessage || 'Unable to unlock your encryption keys.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This can happen if your account data has changed or been corrupted.
              Please sign in again to restore access.
            </p>

            <Button onClick={handleSignOut} className="w-full" variant="destructive">
              Sign Out and Re-authenticate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show unlocking state
  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlocking E2EE
          </DialogTitle>
          <DialogDescription>
            Restoring your encryption keys...
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            Please wait while we unlock your encrypted data.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
