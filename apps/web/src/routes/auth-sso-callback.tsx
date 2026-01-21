import { useEffect, useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useClerk, useSignUp, useSignIn } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, AlertTriangle, Fingerprint, ArrowRight, KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import {
  setupUserKeysWithSharding,
  getOrCreateDeviceId,
  setDecryptedKeys,
  getDecryptedMasterKey,
  type RecoveryKeyInfo,
} from '@onera/crypto';
import { trpc } from '@/lib/trpc';
import { usePasskeySupport } from '@/hooks/useWebAuthnSupport';
import { usePasskeyRegistration } from '@/hooks/useWebAuthn';
import { usePasswordSetup } from '@/hooks/usePasswordUnlock';
import { RecoveryPhraseDisplay } from '@/components/e2ee/RecoveryPhraseDisplay';
import { OnboardingFlow, AddApiKeyPrompt } from '@/components/onboarding';

type CallbackStep = 'processing' | 'onboarding' | 'recovery' | 'confirm' | 'unlock-method' | 'passkey' | 'password' | 'add-api-key' | 'error';

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

export function SSOCallbackPage() {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const { signIn, setActive: setSignInActive } = useSignIn();
  const [step, setStep] = useState<CallbackStep>('processing');
  const [error, setError] = useState<string | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryKeyInfo | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const processingRef = useRef(false);

  // Passkey support
  const { isSupported: passkeySupported, isLoading: isCheckingPasskeySupport } = usePasskeySupport();
  const { registerPasskey, isRegistering: isRegisteringPasskey } = usePasskeyRegistration();
  const { setupPasswordEncryption, isSettingUp: isSettingUpPassword } = usePasswordSetup();

  // tRPC utils for cache invalidation
  const trpcUtils = trpc.useUtils();

  // tRPC mutations for E2EE
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, { enabled: false });
  const onboardingStatusQuery = trpc.keyShares.getOnboardingStatus.useQuery(undefined, { enabled: false });
  const createKeySharesMutation = trpc.keyShares.create.useMutation({
    onSuccess: () => {
      // Invalidate the keyShares.check query so AppLayout doesn't show "Encryption Setup Required"
      trpcUtils.keyShares.check.invalidate();
      trpcUtils.keyShares.get.invalidate();
      trpcUtils.keyShares.getOnboardingStatus.invalidate();
    },
  });
  const registerDeviceMutation = trpc.devices.register.useMutation();
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  // Main OAuth handling effect - handles both OAuth completion AND E2EE setup
  useEffect(() => {
    async function handleOAuthAndE2EE() {
      if (processingRef.current || !clerk.loaded) return;

      let userId: string | null = null;
      let isNewUser = false;

      // Check if the external account already exists (existing user via OAuth)
      const externalAccountError = signUp?.verifications?.externalAccount?.error;
      if (externalAccountError?.code === 'external_account_exists') {
        processingRef.current = true;

        try {
          // Transfer the OAuth verification to sign-in flow
          const result = await signIn?.create({ transfer: true });
          if (result?.status === 'complete' && result.createdSessionId && setSignInActive) {
            await setSignInActive({ session: result.createdSessionId });
            // Wait for Clerk to update
            await new Promise(resolve => setTimeout(resolve, 100));
            userId = clerk.user?.id || null;
            isNewUser = false;
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Sign in failed');
          setStep('error');
          return;
        }
      } else if (signUp?.status === 'complete' && signUp.createdSessionId && setSignUpActive) {
        processingRef.current = true;
        await setSignUpActive({ session: signUp.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        userId = clerk.user?.id || null;
        isNewUser = true;
      } else if (signIn?.status === 'complete' && signIn.createdSessionId && setSignInActive) {
        processingRef.current = true;
        await setSignInActive({ session: signIn.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        userId = clerk.user?.id || null;
        isNewUser = false;
      } else if (clerk.user) {
        // User is already authenticated (maybe from a previous session)
        processingRef.current = true;
        userId = clerk.user.id;
        isNewUser = false;
      }

      // If we have a userId, handle E2EE
      if (userId) {
        try {
          await handleE2EE(userId, isNewUser);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'E2EE setup failed');
          setStep('error');
        }
      }
    }

    async function handleE2EE(_userId: string, _presumedNewUser: boolean) {
      // Check onboarding status to determine where user is in the flow
      let onboardingStatus = null;
      try {
        const result = await onboardingStatusQuery.refetch();
        onboardingStatus = result.data;
      } catch {
        // No status found - treat as new user
      }

      if (onboardingStatus?.hasKeyShares) {
        // User has encryption set up
        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId }).catch(() => {
          // Device may not be registered yet, that's okay
        });

        if (onboardingStatus.onboardingComplete) {
          // Fully onboarded user - redirect to home, E2EEUnlockModal will prompt for unlock
          toast.info('Please unlock your encryption to continue.');
          navigate({ to: '/app' });
        } else {
          // User has keyShares but no unlock method - incomplete onboarding
          // They need to enter their recovery phrase to unlock, then set up passkey/password
          // AppLayout will show OnboardingCompletionModal after they unlock
          toast.info('Please complete your encryption setup. Enter your recovery phrase to continue.');
          navigate({ to: '/app' });
        }
      } else {
        // New user - register device first to get deviceSecret, then setup E2EE keys
        // Step 1: Register device to get server-generated deviceSecret
        const deviceId = getOrCreateDeviceId();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        });

        // Step 2: Setup keys using deviceSecret (not userId)
        // SECURITY: deviceSecret adds server-side entropy to device share encryption
        const keyBundle = await setupUserKeysWithSharding(deviceResult.deviceSecret);

        // Step 3: Store key shares on server
        await createKeySharesMutation.mutateAsync({
          // Auth share is now stored plaintext (protected by Clerk authentication)
          authShare: keyBundle.storableKeys.authShare,
          // Recovery share remains encrypted with recovery key
          encryptedRecoveryShare: keyBundle.storableKeys.encryptedRecoveryShare,
          recoveryShareNonce: keyBundle.storableKeys.recoveryShareNonce,
          // Asymmetric key pair
          publicKey: keyBundle.storableKeys.publicKey,
          encryptedPrivateKey: keyBundle.storableKeys.encryptedPrivateKey,
          privateKeyNonce: keyBundle.storableKeys.privateKeyNonce,
          // Recovery method: master key encrypted with recovery key
          masterKeyRecovery: keyBundle.storableKeys.masterKeyRecovery,
          masterKeyRecoveryNonce: keyBundle.storableKeys.masterKeyRecoveryNonce,
          // Recovery key encrypted with master key (for display)
          encryptedRecoveryKey: keyBundle.storableKeys.encryptedRecoveryKey,
          recoveryKeyNonce: keyBundle.storableKeys.recoveryKeyNonce,
        });

        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        setRecoveryInfo(keyBundle.recoveryInfo);
        // Show onboarding flow for new users before recovery phrase
        setStep('onboarding');
        toast.success('Account created! Let\'s get you set up.');
      }
    }

    handleOAuthAndE2EE();
  }, [clerk.loaded, clerk.user, signUp, signIn, setSignUpActive, setSignInActive, keySharesQuery, onboardingStatusQuery, createKeySharesMutation, registerDeviceMutation, updateLastSeenMutation, navigate]);

  const handleConfirmRecovery = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryInfo) return;

    const firstFourWords = recoveryInfo.mnemonic.split(' ').slice(0, 4).join(' ');
    if (confirmInput.toLowerCase().trim() !== firstFourWords.toLowerCase()) {
      toast.error('Please enter the first 4 words of your recovery phrase');
      return;
    }

    // Show unlock method selection
    setStep('unlock-method');
  };

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
        throw new Error('Master key not available');
      }
      await setupPasswordEncryption(password, masterKey);
      toast.success('Encryption password set!');
      // Show API key prompt for new users
      setStep('add-api-key');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to set up password');
    }
  };

  const handleRegisterPasskey = async () => {
    setPasskeyError(null);
    try {
      const masterKey = getDecryptedMasterKey();
      if (!masterKey) {
        throw new Error('Master key not available');
      }
      await registerPasskey(masterKey, getDeviceName());
      toast.success('Passkey registered!');
      // Show API key prompt for new users
      setStep('add-api-key');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed');
      // Don't show error for user cancellation
      if (error.name === 'NotAllowedError' || error.message.includes('cancel')) {
        return;
      }
      setPasskeyError(error.message);
    }
  };

  const handleSkipPasskey = () => {
    // Show API key prompt for new users
    setStep('add-api-key');
  };

  // Processing step
  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error step
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign In Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error || 'An error occurred during sign in'}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate({ to: '/auth' })} className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarding flow for new users
  if (step === 'onboarding') {
    return (
      <OnboardingFlow
        onComplete={() => setStep('recovery')}
      />
    );
  }

  // Recovery phrase display step
  if (step === 'recovery' && recoveryInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        {/* Decorative background elements */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-br from-amber-500/5 to-transparent blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-gradient-to-tl from-orange-500/5 to-transparent blur-3xl" />
        </div>

        <div className="relative w-full max-w-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/10 ring-1 ring-amber-500/20">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your Recovery Phrase
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the only way to recover your encrypted data. Store it safely.
            </p>
          </div>

          {/* Recovery Phrase Card */}
          <Card className="border-border/50 shadow-xl shadow-black/5">
            <CardContent className="p-6">
              <RecoveryPhraseDisplay
                recoveryInfo={recoveryInfo}
                onContinue={() => setStep('confirm')}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Confirm recovery phrase step
  if (step === 'confirm' && recoveryInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Confirm Recovery Phrase</CardTitle>
                <CardDescription>
                  Verify you've saved your recovery phrase
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleConfirmRecovery} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To confirm you've saved your recovery phrase, enter the first 4 words below.
                </p>

                <div className="space-y-2">
                  <label htmlFor="confirm-words" className="text-sm font-medium">
                    First 4 words
                  </label>
                  <input
                    id="confirm-words"
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Enter the first 4 words..."
                    required
                    autoFocus
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Unlock method selection step
  if (step === 'unlock-method') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Set Up Quick Unlock</CardTitle>
                <CardDescription>
                  Choose how you want to unlock your encrypted data
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Your recovery phrase always works as a backup, but you can set up a faster way to unlock.
              </p>

              <div className="space-y-3">
                {/* Passkey option - only show if supported */}
                {passkeySupported && !isCheckingPasskeySupport && (
                  <button
                    onClick={() => setStep('passkey')}
                    className="w-full flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Fingerprint className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Passkey</p>
                      <p className="text-sm text-muted-foreground">
                        Use Face ID, Touch ID, or Windows Hello. Most secure option.
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground mt-2" />
                  </button>
                )}

                {/* Password option */}
                <button
                  onClick={() => setStep('password')}
                  className="w-full flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Encryption Password</p>
                    <p className="text-sm text-muted-foreground">
                      Set a password to unlock your data. Works on any device.
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground mt-2" />
                </button>
              </div>

              <Button
                variant="ghost"
                onClick={handleSkipPasskey}
                className="w-full"
              >
                Skip for now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                You can always set this up later in Settings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password setup step
  if (step === 'password') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Set Encryption Password</CardTitle>
                <CardDescription>
                  This password will unlock your encrypted data
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSetupPassword} className="space-y-4">
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

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('unlock-method')}
                    disabled={isSettingUpPassword}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSettingUpPassword}>
                    {isSettingUpPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      'Set Password'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Passkey setup step (for SSO users with PRF support)
  if (step === 'passkey') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Add a Passkey</CardTitle>
                <CardDescription>
                  Unlock faster with Face ID, Touch ID, or Windows Hello
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Fingerprint className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Quick unlock</p>
                    <p className="text-xs text-muted-foreground">
                      Use biometrics instead of typing your recovery phrase
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Secure by design</p>
                    <p className="text-xs text-muted-foreground">
                      Your passkey stays on your device and can't be phished
                    </p>
                  </div>
                </div>
              </div>

              {passkeyError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{passkeyError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleRegisterPasskey}
                disabled={isRegisteringPasskey}
                className="w-full"
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('unlock-method')}
                  disabled={isRegisteringPasskey}
                >
                  Back
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipPasskey}
                  disabled={isRegisteringPasskey}
                  className="flex-1"
                >
                  Skip for now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                You can always add a passkey later in Settings
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Add API key prompt step
  if (step === 'add-api-key') {
    return (
      <AddApiKeyPrompt
        onSkip={() => navigate({ to: '/app' })}
      />
    );
  }

  return null;
}
