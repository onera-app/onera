import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useE2EEStore } from '@/stores/e2eeStore';
import { setupUserKeys, type RecoveryKeyInfo } from '@cortex/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

type Step = 'password' | 'recovery' | 'confirm';

export function E2EESetupModal() {
  const { setStatus, setNeedsSetup, setError } = useE2EEStore();
  const createUserKeys = useMutation(api.userKeys.create);

  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryKeyInfo | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setStatus('unlocking');

    try {
      const { recoveryInfo: info, storableKeys } = await setupUserKeys(password);

      await createUserKeys({
        kekSalt: storableKeys.kekSalt,
        kekOpsLimit: storableKeys.kekOpsLimit,
        kekMemLimit: storableKeys.kekMemLimit,
        encryptedMasterKey: storableKeys.encryptedMasterKey,
        masterKeyNonce: storableKeys.masterKeyNonce,
        publicKey: storableKeys.publicKey,
        encryptedPrivateKey: storableKeys.encryptedPrivateKey,
        privateKeyNonce: storableKeys.privateKeyNonce,
        encryptedRecoveryKey: storableKeys.encryptedRecoveryKey,
        recoveryKeyNonce: storableKeys.recoveryKeyNonce,
        masterKeyRecovery: storableKeys.masterKeyRecovery,
        masterKeyRecoveryNonce: storableKeys.masterKeyRecoveryNonce,
      });

      setRecoveryInfo(info);
      setStep('recovery');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to setup E2EE';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRecovery = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryInfo) return;

    const firstFourWords = recoveryInfo.mnemonic.split(' ').slice(0, 4).join(' ');
    if (confirmInput.toLowerCase().trim() !== firstFourWords.toLowerCase()) {
      toast.error('Please enter the first 4 words of your recovery phrase');
      return;
    }

    setNeedsSetup(false);
    setStatus('unlocked');
    toast.success('E2EE setup complete!');
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Set Up E2EE
          </DialogTitle>
          <DialogDescription>
            {step === 'password' && 'Create a password to encrypt your chats.'}
            {step === 'recovery' && 'Save your recovery phrase securely.'}
            {step === 'confirm' && 'Confirm you\'ve saved your recovery phrase.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'password' && (
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This password will be used to unlock your encryption on each device.
            </p>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Setting up...' : 'Continue'}
            </Button>
          </form>
        )}

        {step === 'recovery' && recoveryInfo && (
          <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Write down these {recoveryInfo.wordCount} words and store them safely. You'll need them
                to recover your account if you forget your password.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted rounded-lg font-mono text-sm space-y-2">
              {recoveryInfo.formattedGroups.map((group, idx) => (
                <div key={idx} className="flex gap-4">
                  {group.map((word, wordIdx) => (
                    <span key={wordIdx} className="flex-1">
                      <span className="text-muted-foreground mr-1">{idx * 4 + wordIdx + 1}.</span>
                      {word}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <Button onClick={() => setStep('confirm')} className="w-full">
              I've saved my recovery phrase
            </Button>
          </div>
        )}

        {step === 'confirm' && recoveryInfo && (
          <form onSubmit={handleConfirmRecovery} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To confirm you've saved your recovery phrase, enter the first 4
              words below.
            </p>

            <div className="space-y-2">
              <Label htmlFor="confirm-words">First 4 words</Label>
              <Input
                id="confirm-words"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Enter the first 4 words..."
                required
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('recovery')}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Confirm
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
