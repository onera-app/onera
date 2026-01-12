import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useE2EEStore } from '@/stores/e2eeStore';
import { unlockWithPasswordFlow, type StorableUserKeys } from '@cortex/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Lock } from 'lucide-react';

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
    <Dialog open>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlock E2EE
          </DialogTitle>
          <DialogDescription>
            Enter your password to unlock end-to-end encryption and access your chats.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !userKeys}>
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </Button>

          <Button
            type="button"
            variant="link"
            className="w-full text-sm"
            onClick={() => {
              toast.info('Recovery flow coming soon');
            }}
          >
            Forgot password? Use recovery phrase
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
