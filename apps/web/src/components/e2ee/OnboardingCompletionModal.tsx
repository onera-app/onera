/**
 * Onboarding Completion Modal
 * 
 * Shows when a user has E2EE set up but hasn't configured an unlock method.
 * This happens when a user leaves during onboarding after seeing their recovery phrase
 * but before setting up a passkey or password.
 * 
 * The user must set up at least one unlock method to complete onboarding.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  Smartphone,
  Cloud,
} from 'lucide-react';
import { getDecryptedMasterKey } from '@onera/crypto';
import { usePasskeySupport } from '@/hooks/useWebAuthnSupport';
import { usePasskeyRegistration } from '@/hooks/useWebAuthn';
import { usePasswordSetup } from '@/hooks/usePasswordUnlock';
import { trpc } from '@/lib/trpc';

type Step = 'select' | 'passkey' | 'password';

function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  return `${browser} on ${os}`;
}

interface OnboardingCompletionModalProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingCompletionModal({ open, onComplete }: OnboardingCompletionModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // tRPC utils for invalidation
  const trpcUtils = trpc.useUtils();

  // Passkey support
  const { isSupported: passkeySupported, isLoading: isCheckingPasskeySupport } = usePasskeySupport();
  const { registerPasskey, isRegistering: isRegisteringPasskey } = usePasskeyRegistration();

  // Password setup
  const { setupPasswordEncryption, isSettingUp: isSettingUpPassword } = usePasswordSetup();

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const masterKey = getDecryptedMasterKey();
      if (!masterKey) {
        throw new Error('Encryption must be unlocked first');
      }
      await setupPasswordEncryption(password, masterKey);
      
      // Invalidate onboarding status
      trpcUtils.keyShares.getOnboardingStatus.invalidate();
      
      toast.success('Encryption password set!');
      onComplete();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to set up password');
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyError(null);
    try {
      const masterKey = getDecryptedMasterKey();
      if (!masterKey) {
        throw new Error('Encryption must be unlocked first');
      }
      await registerPasskey(masterKey, getDeviceName());
      
      // Invalidate onboarding status
      trpcUtils.keyShares.getOnboardingStatus.invalidate();
      
      toast.success('Passkey registered!');
      onComplete();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      // Don't show error for user cancellation
      if (error.name === 'NotAllowedError' || error.message.includes('cancel')) {
        return;
      }
      setPasskeyError(error.message);
    }
  };

  // Select unlock method step
  if (step === 'select') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Complete Your Setup
            </DialogTitle>
            <DialogDescription>
              Set up a quick unlock method for your encrypted data.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              You'll use this to unlock your encryption without entering your recovery phrase every time.
            </p>

            <div className="space-y-3">
              {/* Passkey option - only show if supported */}
              {passkeySupported && !isCheckingPasskeySupport && (
                <button
                  onClick={() => setStep('passkey')}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                >
                  <Fingerprint className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Passkey</p>
                    <p className="text-xs text-muted-foreground">
                      Use Face ID, Touch ID, or Windows Hello
                    </p>
                  </div>
                </button>
              )}

              {/* Password option */}
              <button
                onClick={() => setStep('password')}
                className="w-full flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
              >
                <KeyRound className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Encryption Password</p>
                  <p className="text-xs text-muted-foreground">
                    Set a password to unlock your data
                  </p>
                </div>
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Your recovery phrase always works as a backup.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Passkey setup step
  if (step === 'passkey') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-primary" />
              Add a Passkey
            </DialogTitle>
            <DialogDescription>
              Unlock faster with Face ID, Touch ID, or Windows Hello.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Smartphone className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Device Passkey</p>
                <p className="text-xs text-muted-foreground">
                  Works only on this device. Fastest and most secure.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Cloud className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Synced Passkey</p>
                <p className="text-xs text-muted-foreground">
                  Synced via iCloud or Google. Works across your devices.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Your device will automatically choose the best option.
            </p>

            {passkeyError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{passkeyError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('select')} className="w-full sm:w-auto">
              Back
            </Button>
            <Button
              onClick={handleRegisterPasskey}
              disabled={isRegisteringPasskey}
              className="w-full sm:w-auto sm:flex-1"
            >
              {isRegisteringPasskey ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating passkey...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Create Passkey
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Password setup step
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Set Encryption Password
          </DialogTitle>
          <DialogDescription>
            This password will unlock your encrypted data.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSetupPassword}>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  required
                  autoFocus
                  minLength={8}
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

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Use at least 8 characters. This is separate from your account password.
            </p>

            {passwordError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('select')}
              disabled={isSettingUpPassword}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            <Button type="submit" className="w-full sm:w-auto sm:flex-1" disabled={isSettingUpPassword}>
              {isSettingUpPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
