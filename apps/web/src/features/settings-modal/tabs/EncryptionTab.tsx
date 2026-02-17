import { useState } from 'react';
import { toast } from 'sonner';
import { useE2EE } from '@/providers/E2EEProvider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, Unlock, Key, AlertTriangle, Eye, EyeOff, Copy, Fingerprint, Plus } from 'lucide-react';
import { PasskeyList, PasskeyRegistrationModal } from '@/components/e2ee';
import { usePasskeySupport } from '@/hooks/useWebAuthnSupport';

export function EncryptionTab() {
  const { isUnlocked, lock } = useE2EE();
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [showPasskeyRegistration, setShowPasskeyRegistration] = useState(false);

  const { isSupported: passkeySupported, isLoading: isCheckingPasskeySupport } = usePasskeySupport();

  const handleCopyRecoveryPhrase = () => {
    // Recovery phrase should be stored securely and only shown once during setup
    // For now, show a message that it's not available
    toast.info('Recovery phrase is only shown once during initial setup');
  };

  const handleLock = () => {
    lock();
    toast.success('E2EE locked');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">End-to-End Encryption</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your encryption keys and security settings
        </p>
      </div>

      {/* E2EE Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">E2EE Status</CardTitle>
            </div>
            <Badge variant={isUnlocked ? 'success' : 'secondary'}>
              {isUnlocked ? (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlocked
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </>
              )}
            </Badge>
          </div>
          <CardDescription>
            Your data is encrypted with your personal key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            End-to-end encryption ensures that only you can access your API keys and sensitive data.
            Your encryption password never leaves your device.
          </p>
        </CardContent>
      </Card>

      {/* Security Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          If you forget your E2EE password and lose your recovery phrase, your encrypted data will
          be permanently inaccessible. Keep your recovery phrase safe.
        </AlertDescription>
      </Alert>

      {/* Passkeys Section */}
      {isUnlocked && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Passkeys</CardTitle>
              </div>
              {passkeySupported && !isCheckingPasskeySupport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasskeyRegistration(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Passkey
                </Button>
              )}
            </div>
            <CardDescription>
              Use Face ID, Touch ID, or Windows Hello to unlock your encryption faster
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!passkeySupported && !isCheckingPasskeySupport ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Passkeys are not supported on this device or browser. Use your recovery phrase to unlock.
              </p>
            ) : (
              <PasskeyList />
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-4">
        {isUnlocked && (
          <>
            {/* Lock E2EE */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Lock Encryption</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Lock to prevent access until password is entered again
                </p>
              </div>
              <Button variant="outline" onClick={handleLock}>
                <Lock className="h-4 w-4 mr-2" />
                Lock Now
              </Button>
            </div>

            {/* View Recovery Phrase */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-normal">Recovery Phrase</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  View your 24-word recovery phrase
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowRecoveryDialog(true)}>
                <Key className="h-4 w-4 mr-2" />
                View Phrase
              </Button>
            </div>
          </>
        )}

        {!isUnlocked && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Unlock E2EE to access these settings
          </p>
        )}
      </div>

      {/* Recovery Phrase Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={setShowRecoveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recovery Phrase</DialogTitle>
            <DialogDescription>
              Keep this phrase safe. It's the only way to recover your data if you forget your
              password.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Never share this phrase with anyone. Anyone with this phrase can access your data.
              </AlertDescription>
            </Alert>

            <div className="relative">
              <div
                className={`font-mono text-sm p-4 bg-gray-100 dark:bg-gray-850 rounded-lg break-words ${
                  !showPhrase ? 'blur-sm select-none' : ''
                }`}
              >
                Your recovery phrase was shown during initial setup. If you didn't save it, you may need to reset your encryption.
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                {!showPhrase && (
                  <Button variant="secondary" onClick={() => setShowPhrase(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Reveal Phrase
                  </Button>
                )}
              </div>
            </div>

            {showPhrase && (
              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={() => setShowPhrase(false)} className="flex-1">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </Button>
                <Button variant="outline" onClick={handleCopyRecoveryPhrase} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowRecoveryDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Passkey Registration Modal */}
      <PasskeyRegistrationModal
        open={showPasskeyRegistration}
        onOpenChange={setShowPasskeyRegistration}
        onSuccess={() => {
          // Passkey list will auto-refresh via query invalidation
        }}
      />
    </div>
  );
}
