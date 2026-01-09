import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useE2EEStore } from '@/stores/e2eeStore';
import { unlockWithPasswordFlow, type StorableUserKeys } from '@cortex/crypto';
import { getUserKeys } from '@/lib/api/userKeys';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

// Convert API response to StorableUserKeys format
function toStorableKeys(apiKeys: {
  kek_salt: string;
  kek_ops_limit: number;
  kek_mem_limit: number;
  encrypted_master_key: string;
  master_key_nonce: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  encrypted_recovery_key?: string;
  recovery_key_nonce?: string;
  master_key_recovery?: string;
  master_key_recovery_nonce?: string;
}): StorableUserKeys {
  return {
    kekSalt: apiKeys.kek_salt,
    kekOpsLimit: apiKeys.kek_ops_limit,
    kekMemLimit: apiKeys.kek_mem_limit,
    encryptedMasterKey: apiKeys.encrypted_master_key,
    masterKeyNonce: apiKeys.master_key_nonce,
    publicKey: apiKeys.public_key,
    encryptedPrivateKey: apiKeys.encrypted_private_key,
    privateKeyNonce: apiKeys.private_key_nonce,
    encryptedRecoveryKey: apiKeys.encrypted_recovery_key || '',
    recoveryKeyNonce: apiKeys.recovery_key_nonce || '',
    masterKeyRecovery: apiKeys.master_key_recovery || '',
    masterKeyRecoveryNonce: apiKeys.master_key_recovery_nonce || '',
  };
}

export function E2EEUnlockModal() {
  const { token } = useAuthStore();
  const { setStatus, setError } = useE2EEStore();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setIsLoading(true);
    setStatus('unlocking');

    try {
      // Fetch user keys from server
      const apiKeys = await getUserKeys(token);
      const storableKeys = toStorableKeys(apiKeys);

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
          <Button type="submit" className="flex-1" disabled={isLoading}>
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
