/**
 * E2EE Unlock Modal
 * Prompts user to enter recovery phrase to unlock E2EE
 *
 * SECURITY: The old "auto-unlock" using user ID was removed as a vulnerability.
 * Users must now enter their recovery phrase on each new device.
 */

import { useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useE2EEStore } from '@/stores/e2eeStore';
import {
  unlockWithRecoveryPhrase,
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
import { Loader2, Lock, AlertTriangle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function E2EEUnlockModal() {
  const { setStatus, setError } = useE2EEStore();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [unlockState, setUnlockState] = useState<'waiting' | 'unlocking' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch key shares
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  // Update device last seen
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  const handleUnlock = async () => {
    if (!user || !keySharesQuery.data) {
      setUnlockState('error');
      setErrorMessage('No encryption keys found. Please sign in again.');
      return;
    }

    if (!recoveryPhrase.trim()) {
      toast.error('Please enter your recovery phrase');
      return;
    }

    setUnlockState('unlocking');
    setStatus('unlocking');

    try {
      const keyShares = keySharesQuery.data;

      // Unlock using recovery phrase
      const decryptedKeys = unlockWithRecoveryPhrase(recoveryPhrase.trim(), {
        masterKeyRecovery: keyShares.masterKeyRecovery,
        masterKeyRecoveryNonce: keyShares.masterKeyRecoveryNonce,
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
      console.error('Unlock failed:', err);
      const message = err instanceof Error ? err.message : 'Invalid recovery phrase';
      setError(message);
      setUnlockState('error');
      setErrorMessage(message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  const handleRetry = () => {
    setUnlockState('waiting');
    setErrorMessage(null);
    setRecoveryPhrase('');
  };

  // Loading state while fetching key shares
  if (keySharesQuery.isLoading) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Loading Encryption Keys
            </DialogTitle>
            <DialogDescription>
              Please wait...
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state if no key shares found
  if (keySharesQuery.error || !keySharesQuery.data) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              No Encryption Keys Found
            </DialogTitle>
            <DialogDescription>
              Your account doesn't have encryption keys set up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please sign out and sign in again to set up encryption.
            </p>

            <Button onClick={handleSignOut} className="w-full" variant="destructive">
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state with retry option
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
              Make sure you entered your 12 or 24 word recovery phrase correctly.
            </p>

            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={handleSignOut} variant="destructive" className="flex-1">
                Sign Out
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Unlocking state
  if (unlockState === 'unlocking') {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Unlocking E2EE
            </DialogTitle>
            <DialogDescription>
              Decrypting your data...
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

  // Waiting for recovery phrase
  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Enter Recovery Phrase
          </DialogTitle>
          <DialogDescription>
            Please enter your 12 or 24 word recovery phrase to unlock your encrypted data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-phrase">Recovery Phrase</Label>
            <Textarea
              id="recovery-phrase"
              placeholder="Enter your recovery phrase (12 or 24 words separated by spaces)"
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This is the phrase you saved when you first created your account.
            </p>
          </div>

          <Button onClick={handleUnlock} className="w-full" disabled={!recoveryPhrase.trim()}>
            Unlock
          </Button>

          <div className="text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:underline"
            >
              Sign out instead
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
