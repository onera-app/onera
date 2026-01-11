import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useE2EEStore } from '@/stores/e2eeStore';
import { setupUserKeys, type RecoveryKeyInfo } from '@cortex/crypto';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

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

      // Save keys to server via Convex
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

    // Check if user entered the first 4 words correctly
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
    <Modal open onClose={() => {}} title="Set Up E2EE" closable={false}>
      {step === 'password' && (
        <form onSubmit={handleSetupPassword} className="space-y-4">
          <p className="text-gray-500 dark:text-gray-400">
            Create a password to encrypt your chats. This password will be used
            to unlock your encryption on each device.
          </p>

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="new-password"
            minLength={8}
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Setting up...' : 'Continue'}
          </Button>
        </form>
      )}

      {step === 'recovery' && recoveryInfo && (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              Save your recovery phrase
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Write down these {recoveryInfo.wordCount} words and store them safely. You'll need them
              to recover your account if you forget your password.
            </p>
          </div>

          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm space-y-2">
            {recoveryInfo.formattedGroups.map((group, idx) => (
              <div key={idx} className="flex gap-4">
                {group.map((word, wordIdx) => (
                  <span key={wordIdx} className="flex-1">
                    <span className="text-gray-400 mr-1">{idx * 4 + wordIdx + 1}.</span>
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
          <p className="text-gray-500 dark:text-gray-400">
            To confirm you've saved your recovery phrase, enter the first 4
            words below.
          </p>

          <Input
            label="First 4 words"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="Enter the first 4 words..."
            required
            autoFocus
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
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
    </Modal>
  );
}
