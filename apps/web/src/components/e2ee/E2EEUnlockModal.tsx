/**
 * E2EE Unlock Modal
 * Prompts user to unlock E2EE via passkey, password, or recovery phrase
 *
 * SECURITY: The old "auto-unlock" using user ID was removed as a vulnerability.
 * Users must now either:
 * 1. Use a passkey (with PRF extension for key derivation)
 * 2. Use an encryption password (Argon2id key derivation)
 * 3. Enter their recovery phrase
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
  decryptKey,
  fromBase64,
} from '@onera/crypto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Lock, AlertTriangle, Key, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyUnlockButton } from './PasskeyUnlockButton';
import { useHasPasskeys } from '@/hooks/useWebAuthn';
import { usePasskeySupport } from '@/hooks/useWebAuthnSupport';
import { useHasPasswordEncryption, usePasswordUnlock } from '@/hooks/usePasswordUnlock';

type UnlockView = 'options' | 'password' | 'recovery';

export function E2EEUnlockModal() {
  const { setStatus, setError } = useE2EEStore();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockState, setUnlockState] = useState<'waiting' | 'unlocking' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<UnlockView>('options');

  // Check for passkey support
  const { hasPasskeys, isLoading: isCheckingPasskeys } = useHasPasskeys(!!user);
  const { isSupported: passkeySupported, isLoading: isCheckingSupport } = usePasskeySupport();

  // Check for password encryption
  const { hasPassword, isLoading: isCheckingPassword } = useHasPasswordEncryption(!!user);
  const { unlockWithPassword, isUnlocking: isUnlockingWithPassword } = usePasswordUnlock();

  // Fetch key shares
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  // Update device last seen
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  // Show passkey option if user has passkeys and browser supports it
  const canUsePasskey = hasPasskeys && passkeySupported && !isCheckingPasskeys && !isCheckingSupport;
  const canUsePassword = hasPassword && !isCheckingPassword;

  const handlePasswordUnlock = async () => {
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setUnlockState('unlocking');
    setStatus('unlocking');

    try {
      const masterKey = await unlockWithPassword(password);

      // Get the public/private key from key shares
      const keyShares = keySharesQuery.data!;

      // Decrypt private key with master key
      const privateKey = decryptKey(
        { ciphertext: keyShares.encryptedPrivateKey, nonce: keyShares.privateKeyNonce },
        masterKey
      );

      // Set decrypted keys
      setDecryptedKeys({
        masterKey,
        publicKey: fromBase64(keyShares.publicKey),
        privateKey,
      });

      // Update device last seen
      const deviceId = getOrCreateDeviceId();
      await updateLastSeenMutation.mutateAsync({ deviceId });

      setStatus('unlocked');
      toast.success('Welcome back!');
    } catch (err) {
      console.error('Password unlock failed:', err);
      const message = err instanceof Error ? err.message : 'Incorrect password';
      setError(message);
      setUnlockState('error');
      setErrorMessage(message);
    }
  };

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
    setPassword('');
    setCurrentView('options');
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

  // Check if still loading unlock method info
  const isLoadingUnlockInfo = isCheckingPasskeys || isCheckingSupport || isCheckingPassword;

  // Helper to get description based on available methods
  const getDescription = () => {
    const methods = [];
    if (canUsePasskey) methods.push('passkey');
    if (canUsePassword) methods.push('password');
    methods.push('recovery phrase');

    if (methods.length === 1) {
      return `Enter your ${methods[0]} to unlock your encrypted data.`;
    }
    return `Use your ${methods.slice(0, -1).join(', ')} or ${methods[methods.length - 1]} to unlock.`;
  };

  // Waiting state - show unlock options
  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlock Encryption
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading state */}
          {isLoadingUnlockInfo ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : currentView === 'options' ? (
            /* Options view - show available unlock methods */
            <div className="space-y-3">
              {/* Passkey option */}
              {canUsePasskey && (
                <PasskeyUnlockButton className="w-full" />
              )}

              {/* Password option */}
              {canUsePassword && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setCurrentView('password')}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Unlock with Password
                </Button>
              )}

              {/* Recovery phrase option */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setCurrentView('recovery')}
              >
                <Key className="h-4 w-4 mr-2" />
                Use Recovery Phrase
              </Button>
            </div>
          ) : currentView === 'password' ? (
            /* Password input view */
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setCurrentView('options')}
              >
                &larr; Back to options
              </Button>

              <div className="space-y-2">
                <Label htmlFor="unlock-password">Encryption Password</Label>
                <div className="relative">
                  <Input
                    id="unlock-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your encryption password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordUnlock()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handlePasswordUnlock}
                className="w-full"
                disabled={!password.trim() || isUnlockingWithPassword}
              >
                {isUnlockingWithPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  'Unlock'
                )}
              </Button>
            </div>
          ) : (
            /* Recovery phrase input view */
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setCurrentView('options')}
              >
                &larr; Back to options
              </Button>

              <div className="space-y-2">
                <Label htmlFor="recovery-phrase">Recovery Phrase</Label>
                <Textarea
                  id="recovery-phrase"
                  placeholder="Enter your recovery phrase (12 or 24 words separated by spaces)"
                  value={recoveryPhrase}
                  onChange={(e) => setRecoveryPhrase(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is the phrase you saved when you first created your account.
                </p>
              </div>

              <Button onClick={handleUnlock} className="w-full" disabled={!recoveryPhrase.trim()}>
                Unlock
              </Button>
            </div>
          )}

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
