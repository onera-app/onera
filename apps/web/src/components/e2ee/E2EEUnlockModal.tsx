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
import { useAuth } from '@/providers/SupabaseAuthProvider';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useE2EEStore } from '@/stores/e2eeStore';
import {
  unlockWithRecoveryPhrase,
  setDecryptedKeys,
  getOrCreateDeviceId,
  decryptKey,
  fromBase64,
  clearAllDeviceData,
} from '@onera/crypto';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { MandatoryLogoutConfirm } from './MandatoryLogoutConfirm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, AlertTriangle, Key, KeyRound, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyUnlockButton } from './PasskeyUnlockButton';
import { useHasPasskeys } from '@/hooks/useWebAuthn';
import { usePasskeySupport } from '@/hooks/useWebAuthnSupport';
import { useHasPasswordEncryption, usePasswordUnlock } from '@/hooks/usePasswordUnlock';

type UnlockView = 'options' | 'password' | 'recovery' | 'reset';

export function E2EEUnlockModal() {
  const { setStatus, setError, setNeedsSetup } = useE2EEStore();
  const { user, signOut } = useAuth();
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockState, setUnlockState] = useState<'waiting' | 'unlocking' | 'error'>('waiting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<UnlockView>('options');
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  // tRPC utils for invalidation
  const trpcUtils = trpc.useUtils();

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

  // Reset encryption mutation
  const resetEncryptionMutation = trpc.keyShares.resetEncryption.useMutation({
    onSuccess: () => {
      // Clear local device data
      clearAllDeviceData();
      // Invalidate all queries
      trpcUtils.keyShares.invalidate();
      trpcUtils.webauthn.invalidate();
      trpcUtils.devices.invalidate();
      // Set needs setup to trigger E2EESetupModal
      setNeedsSetup(true);
      toast.success('Encryption reset. Please set up encryption again.');
    },
  });

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowSignOutConfirm(true);
    }
  };

  const handleRetry = () => {
    setUnlockState('waiting');
    setErrorMessage(null);
    setRecoveryPhrase('');
    setPassword('');
    setResetConfirmInput('');
    setResetError(null);
    setCurrentView('options');
  };

  const handleReset = async () => {
    setResetError(null);

    if (resetConfirmInput !== 'RESET MY ENCRYPTION') {
      setResetError('Please type "RESET MY ENCRYPTION" exactly to confirm');
      return;
    }

    try {
      await resetEncryptionMutation.mutateAsync({ confirmPhrase: resetConfirmInput });
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset encryption');
    }
  };

  // Loading state while fetching key shares
  const renderContent = () => {
    if (keySharesQuery.isLoading) {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
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
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // Error state if no key shares found
    if (keySharesQuery.error || !keySharesQuery.data) {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                No Encryption Keys Found
              </DialogTitle>
              <DialogDescription>
                Your account doesn't have encryption keys set up.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Please sign out and sign in again to set up encryption.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleSignOut} variant="destructive" className="w-full">
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Error state with retry option
    if (unlockState === 'error') {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Unlock Failed
              </DialogTitle>
              <DialogDescription>
                {errorMessage || 'Unable to unlock your encryption keys.'}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Make sure you entered your 12 or 24 word recovery phrase correctly.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleRetry} variant="outline" className="w-full sm:w-auto">
                Try Again
              </Button>
              <Button onClick={handleSignOut} variant="destructive" className="w-full sm:w-auto">
                Sign Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Unlocking state
    if (unlockState === 'unlocking') {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Unlocking Encryption
              </DialogTitle>
              <DialogDescription>
                Decrypting your data...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
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

    // Options view
    if (currentView === 'options') {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Unlock Encryption
              </DialogTitle>
              <DialogDescription>
                {getDescription()}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {isLoadingUnlockInfo ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {canUsePasskey && (
                    <PasskeyUnlockButton className="w-full" />
                  )}

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

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setCurrentView('recovery')}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Use Recovery Phrase
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={handleSignOut} className="w-full sm:w-auto">
                Sign out instead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Password view
    if (currentView === 'password') {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Enter Password
              </DialogTitle>
              <DialogDescription>
                Enter your encryption password to unlock.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCurrentView('options')} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                onClick={handlePasswordUnlock}
                className="w-full sm:w-auto sm:flex-1"
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Recovery phrase view
    if (currentView === 'recovery') {
      return (
        <Dialog open onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Recovery Phrase
              </DialogTitle>
              <DialogDescription>
                Enter your 12 or 24 word recovery phrase.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-phrase">Recovery Phrase</Label>
                <Textarea
                  id="recovery-phrase"
                  placeholder="Enter your recovery phrase (words separated by spaces)"
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

              <div className="pt-2 border-t">
                <button
                  onClick={() => setCurrentView('reset')}
                  className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                >
                  Lost your recovery phrase? Reset encryption
                </button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCurrentView('options')} className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                onClick={handleUnlock}
                className="w-full sm:w-auto sm:flex-1"
                disabled={!recoveryPhrase.trim()}
              >
                Unlock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }

    // Reset view
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Reset Encryption
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete your encryption keys.
                Any encrypted data (chats, notes, API keys) will become inaccessible forever.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="reset-confirm">
                Type <span className="font-mono font-bold">RESET MY ENCRYPTION</span> to confirm
              </Label>
              <Input
                id="reset-confirm"
                placeholder="RESET MY ENCRYPTION"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                className="font-mono"
                autoFocus
              />
            </div>

            {resetError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrentView('recovery')} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              variant="destructive"
              className="w-full sm:w-auto sm:flex-1"
              disabled={resetConfirmInput !== 'RESET MY ENCRYPTION' || resetEncryptionMutation.isPending}
            >
              {resetEncryptionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Encryption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {renderContent()}

      <MandatoryLogoutConfirm
        open={showSignOutConfirm}
        onOpenChange={setShowSignOutConfirm}
        title="Exit Unlock?"
        description="Unlocking your encryption is required to access your data. If you exit now, you will be signed out."
      />
    </>
  );
}
