import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { RecoveryKeyInfo } from '@onera/crypto';

type AuthStep = 'credentials' | 'recovery' | 'confirm';

export function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('credentials');
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryKeyInfo | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Redirect if already authenticated (only if not showing recovery phrase)
  // Note: We check !isLoading to prevent redirect during signup flow
  // (fetchSession sets isAuthenticated before setStep('recovery') runs)
  useEffect(() => {
    if (isAuthenticated && !authLoading && !isLoading && step === 'credentials') {
      navigate({ to: '/app' });
    }
  }, [isAuthenticated, authLoading, isLoading, navigate, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await signIn(form.email, form.password);
        toast.success('Welcome back!');
        navigate({ to: '/app' });
      } else {
        const recovery = await signUp(form.email, form.password, form.name || form.email.split('@')[0]);
        setRecoveryInfo(recovery);
        setStep('recovery');
        toast.success('Account created! Please save your recovery phrase.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
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

    toast.success('Setup complete! Welcome to Onera.');
    navigate({ to: '/app' });
  };

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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Login/Signup form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Onera</CardTitle>
              <CardDescription>E2EE AI Chat</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoComplete="name"
                    placeholder="Your name (optional)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </CardFooter>
        </Card>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Your data is end-to-end encrypted. Only you can read your chats.</span>
        </div>
      </div>
    </div>
  );
}
