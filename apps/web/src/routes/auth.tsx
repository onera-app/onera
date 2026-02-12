import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth, useSignInWithE2EE } from "@/providers/ClerkAuthProvider";
import { Button } from "@/components/ui/button";
import { OneraLogo } from "@/components/ui/onera-logo";
import { Spinner } from "@/components/ui/spinner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isLoaded, isLoading, signInWithOAuth } = useSignInWithE2EE();
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "apple" | null
  >(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate({ to: "/app" });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingProvider("google");
      await signInWithOAuth("oauth_google");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setLoadingProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoadingProvider("apple");
      await signInWithOAuth("oauth_apple");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apple sign in failed");
      setLoadingProvider(null);
    }
  };

  const isButtonLoading = isLoading || loadingProvider !== null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white dark:bg-background selection:bg-neutral-900 selection:text-white dark:selection:bg-white dark:selection:text-neutral-900">
      <div className="w-full max-w-[360px] relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="mb-10">
          <OneraLogo size={64} className="text-neutral-900 dark:text-white" />
        </div>

        {/* Heading */}
        <div className="mb-12 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-white">
            Sign in to Onera
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-base">
            Private, encrypted AI chat.
          </p>
        </div>

        {/* Auth Buttons */}
        <div className="w-full space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] shadow-sm"
            onClick={handleGoogleSignIn}
            disabled={!isLoaded || isButtonLoading}
          >
            {loadingProvider === "google" ? (
              <Spinner size="sm" />
            ) : (
              <div className="absolute left-4">
                <GoogleIcon className="w-5 h-5" />
              </div>
            )}
            <span className="font-medium text-base">Continue with Google</span>
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] shadow-sm"
            onClick={handleAppleSignIn}
            disabled={!isLoaded || isButtonLoading}
          >
            {loadingProvider === "apple" ? (
              <Spinner size="sm" />
            ) : (
              <div className="absolute left-4">
                <AppleIcon className="w-5 h-5 text-black dark:text-white" />
              </div>
            )}
            <span className="font-medium text-base">Continue with Apple</span>
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-neutral-400 dark:text-neutral-400 max-w-xs mx-auto leading-relaxed">
          By continuing, you agree to our{" "}
          <Link
            to="/terms"
            className="underline hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="underline hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
