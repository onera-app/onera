import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useE2EEStore } from '@/stores/e2eeStore';
import { unlockWithPasswordFlow, type StorableUserKeys } from '@cortex/crypto';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

// Convert Convex response to StorableUserKeys format
function toStorableKeys(keys: {
  kekSalt: string;
  kekOpsLimit: number;
  kekMemLimit: number;
  encryptedMasterKey: string;
  masterKeyNonce: string;
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyNonce: string;
  encryptedRecoveryKey: string;
  recoveryKeyNonce: string;
  masterKeyRecovery: string;
  masterKeyRecoveryNonce: string;
}): StorableUserKeys {
  return {
    kekSalt: keys.kekSalt,
    kekOpsLimit: keys.kekOpsLimit,
    kekMemLimit: keys.kekMemLimit,
    encryptedMasterKey: keys.encryptedMasterKey,
    masterKeyNonce: keys.masterKeyNonce,
    publicKey: keys.publicKey,
    encryptedPrivateKey: keys.encryptedPrivateKey,
    privateKeyNonce: keys.privateKeyNonce,
    encryptedRecoveryKey: keys.encryptedRecoveryKey || '',
    recoveryKeyNonce: keys.recoveryKeyNonce || '',
    masterKeyRecovery: keys.masterKeyRecovery || '',
    masterKeyRecoveryNonce: keys.masterKeyRecoveryNonce || '',
  };
}

export function E2EEUnlockModal() {
  const { setStatus, setError } = useE2EEStore();
  const userKeys = useQuery(api.userKeys.get);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userKeys) {
      toast.error('Unable to fetch encryption keys');
      return;
    }

    setIsLoading(true);
    setStatus('unlocking');

    try {
      const storableKeys = toStorableKeys(userKeys);

      // Unlock with password and keys
      await unlockWithPasswordFlow(password, storableKeys);
      setStatus('unlocked');
      toast.success('E2EE unlocked');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlock';
      setError(message);
      setStatus('locked');
      toast.error(message);
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <Modal open onClose={() => {}} title="Unlock E2EE" closable={false}>
      <form onSubmit={handleUnlock} className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400">
          Enter your password to unlock end-to-end encryption and access your
          chats.
        </p>

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          autoComplete="current-password"
        />

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={isLoading || !userKeys}>
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </Button>
        </div>

        <button
          type="button"
          className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline"
          onClick={() => {
            // TODO: Implement recovery flow
            toast.info('Recovery flow coming soon');
          }}
        >
          Forgot password? Use recovery phrase
        </button>
      </form>
    </Modal>
  );
}
