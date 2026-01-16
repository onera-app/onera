import { useEffect, useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useClerk, useSignUp, useSignIn } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  setupUserKeysWithSharding,
  unlockWithLoginKey,
  getOrCreateDeviceId,
  setDecryptedKeys,
  type RecoveryKeyInfo,
} from '@onera/crypto';
import { trpc } from '@/lib/trpc';

type CallbackStep = 'processing' | 'recovery' | 'confirm' | 'error';

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
  const processingRef = useRef(false);

  // tRPC mutations for E2EE
  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, { enabled: false });
  const createKeySharesMutation = trpc.keyShares.create.useMutation();
  const registerDeviceMutation = trpc.devices.register.useMutation();
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  // Debug logging
  useEffect(() => {
    console.log('SSO Callback state:', {
      step,
      error,
      hasProcessed: processingRef.current,
      clerkLoaded: clerk.loaded,
      signUpStatus: signUp?.status,
      signInStatus: signIn?.status,
      clerkUser: clerk.user?.id
    });
  }, [step, error, clerk.loaded, clerk.user?.id, signUp?.status, signIn?.status]);

  // Main OAuth handling effect - handles both OAuth completion AND E2EE setup
  useEffect(() => {
    async function handleOAuthAndE2EE() {
      if (processingRef.current || !clerk.loaded) return;

      console.log('Handling OAuth callback:', {
        signUpStatus: signUp?.status,
        signInStatus: signIn?.status,
        externalAccountError: signUp?.verifications?.externalAccount?.error?.code,
        hasUser: !!clerk.user
      });

      let userId: string | null = null;
      let isNewUser = false;

      // Check if the external account already exists (existing user via OAuth)
      const externalAccountError = signUp?.verifications?.externalAccount?.error;
      if (externalAccountError?.code === 'external_account_exists') {
        console.log('External account exists, transferring to sign-in...');
        processingRef.current = true;

        try {
          // Transfer the OAuth verification to sign-in flow
          const result = await signIn?.create({ transfer: true });
          if (result?.status === 'complete' && result.createdSessionId) {
            await setSignInActive({ session: result.createdSessionId });
            // Wait for Clerk to update
            await new Promise(resolve => setTimeout(resolve, 100));
            userId = clerk.user?.id || null;
            isNewUser = false;
          }
        } catch (err) {
          console.error('Transfer failed:', err);
          setError(err instanceof Error ? err.message : 'Sign in failed');
          setStep('error');
          return;
        }
      } else if (signUp?.status === 'complete' && signUp.createdSessionId) {
        console.log('SignUp complete, setting active session...');
        processingRef.current = true;
        await setSignUpActive({ session: signUp.createdSessionId });
        await new Promise(resolve => setTimeout(resolve, 100));
        userId = clerk.user?.id || null;
        isNewUser = true;
      } else if (signIn?.status === 'complete' && signIn.createdSessionId) {
        console.log('SignIn complete, setting active session...');
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
        console.log('Processing E2EE for user:', userId, 'isNewUser:', isNewUser);
        try {
          await handleE2EE(userId, isNewUser);
        } catch (err) {
          console.error('E2EE setup failed:', err);
          setError(err instanceof Error ? err.message : 'E2EE setup failed');
          setStep('error');
        }
      }
    }

    async function handleE2EE(userId: string, presumedNewUser: boolean) {
      // Check if user has existing key shares
      let keyShares = null;
      try {
        const result = await keySharesQuery.refetch();
        keyShares = result.data;
      } catch (err) {
        console.log('No existing key shares found');
      }

      if (keyShares) {
        // Existing user - unlock with login key
        console.log('Unlocking existing user keys...');
        const decryptedKeys = unlockWithLoginKey(userId, {
          encryptedMasterKeyForLogin: keyShares.encryptedMasterKeyForLogin,
          masterKeyForLoginNonce: keyShares.masterKeyForLoginNonce,
          encryptedPrivateKey: keyShares.encryptedPrivateKey,
          privateKeyNonce: keyShares.privateKeyNonce,
          publicKey: keyShares.publicKey,
        });

        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        // Update device last seen
        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

        toast.success('Welcome back!');
        navigate({ to: '/' });
      } else {
        // New user - setup E2EE keys
        console.log('Setting up new user keys...');
        const keyBundle = await setupUserKeysWithSharding(userId);

        await createKeySharesMutation.mutateAsync({
          encryptedAuthShare: keyBundle.storableKeys.encryptedAuthShare,
          authShareNonce: keyBundle.storableKeys.authShareNonce,
          encryptedRecoveryShare: keyBundle.storableKeys.encryptedRecoveryShare,
          recoveryShareNonce: keyBundle.storableKeys.recoveryShareNonce,
          publicKey: keyBundle.storableKeys.publicKey,
          encryptedPrivateKey: keyBundle.storableKeys.encryptedPrivateKey,
          privateKeyNonce: keyBundle.storableKeys.privateKeyNonce,
          masterKeyRecovery: keyBundle.storableKeys.masterKeyRecovery,
          masterKeyRecoveryNonce: keyBundle.storableKeys.masterKeyRecoveryNonce,
          encryptedRecoveryKey: keyBundle.storableKeys.encryptedRecoveryKey,
          recoveryKeyNonce: keyBundle.storableKeys.recoveryKeyNonce,
          encryptedMasterKeyForLogin: keyBundle.storableKeys.encryptedMasterKeyForLogin,
          masterKeyForLoginNonce: keyBundle.storableKeys.masterKeyForLoginNonce,
        });

        // Register device
        const deviceId = getOrCreateDeviceId();
        await registerDeviceMutation.mutateAsync({
          deviceId,
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        });

        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        setRecoveryInfo(keyBundle.recoveryInfo);
        setStep('recovery');
        toast.success('Account created! Please save your recovery phrase.');
      }
    }

    handleOAuthAndE2EE();
  }, [clerk.loaded, clerk.user, signUp, signIn, setSignUpActive, setSignInActive, keySharesQuery, createKeySharesMutation, registerDeviceMutation, updateLastSeenMutation, navigate]);

  const handleConfirmRecovery = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recoveryInfo) return;

    const firstFourWords = recoveryInfo.mnemonic.split(' ').slice(0, 4).join(' ');
    if (confirmInput.toLowerCase().trim() !== firstFourWords.toLowerCase()) {
      toast.error('Please enter the first 4 words of your recovery phrase');
      return;
    }

    toast.success('Setup complete! Welcome to Onera.');
    navigate({ to: '/' });
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

  // Recovery phrase display step
  if (step === 'recovery' && recoveryInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Save Your Recovery Phrase</CardTitle>
                <CardDescription>
                  Write these words down and store them safely
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Write down these {recoveryInfo.wordCount} words and store them safely. You'll need them
                  to recover your account on new devices or if you lose access.
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

  return null;
}
