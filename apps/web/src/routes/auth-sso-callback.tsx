import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSSOCallback } from "@/providers/SupabaseAuthProvider";
import { toast } from "sonner";
import {
  getDecryptedMasterKey,
  type RecoveryKeyInfo,
} from "@onera/crypto";
import { trpc } from "@/lib/trpc";
import { usePasskeySupport } from "@/hooks/useWebAuthnSupport";
import { usePasskeyRegistration } from "@/hooks/useWebAuthn";
import { usePasswordSetup } from "@/hooks/usePasswordUnlock";
import { OnboardingFlow } from "@/components/onboarding";
import { RecoveryPhraseDisplay } from "@/components/e2ee/RecoveryPhraseDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { normalizeAppError } from "@/lib/errors/app-error";

type CallbackView = "processing" | "onboarding" | "passkey" | "password" | "recovery" | "error";

type CallbackStage =
  | "oauth_complete"
  | "keyshare_status_check"
  | "device_registration"
  | "key_setup"
  | "unlock_method_setup"
  | "recovery_ack"
  | "done"
  | "error";

function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";

  return `${browser} on ${os}`;
}

export function SSOCallbackPage() {
  const navigate = useNavigate();
  const {
    isReady,
    processCallback,
  } = useSSOCallback();
  const [view, setView] = useState<CallbackView>("processing");
  const [stage, setStage] = useState<CallbackStage>("oauth_complete");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryKeyInfo | null>(null);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const processingRef = useRef(false);

  const { isSupported: passkeySupported, isLoading: isCheckingPasskeySupport } = usePasskeySupport();
  const { registerPasskey, isRegistering: isRegisteringPasskey } = usePasskeyRegistration();
  const { setupPasswordEncryption, isSettingUp: isSettingUpPassword } = usePasswordSetup();

  const trpcUtils = trpc.useUtils();

  const stageLabel = useMemo(() => {
    const map: Record<CallbackStage, string> = {
      oauth_complete: "Completing OAuth session",
      keyshare_status_check: "Checking encryption state",
      device_registration: "Registering device",
      key_setup: "Setting up encryption keys",
      unlock_method_setup: "Configuring unlock method",
      recovery_ack: "Preparing recovery backup",
      done: "Finishing setup",
      error: "Error",
    };
    return map[stage];
  }, [stage]);

  const failWith = useCallback((error: unknown, defaultMessage: string): void => {
    const normalized = normalizeAppError(error, defaultMessage, { stage });
    setErrorMessage(normalized.userMessage);
    setStage("error");
    setView("error");
  }, [stage]);

  // This initialization must run once per callback entry.
  // Supabase handles OAuth session resolution automatically via onAuthStateChange.
  // We just wait for isReady (authenticated user exists) then process the callback.
  useEffect(() => {
    const initialize = async () => {
      if (processingRef.current || !isReady) {
        return;
      }
      processingRef.current = true;
      setView("processing");
      setStage("oauth_complete");

      try {
        setStage("keyshare_status_check");
        const result = await processCallback();

        if (!result.isNewUser) {
          // Existing user - redirect to app (E2EE unlock modal will handle the rest)
          toast.info("Please unlock your encryption to continue.");
          setStage("done");
          navigate({ to: "/app" });
          return;
        }

        // New user - show onboarding flow
        setRecoveryInfo(result.recoveryInfo || null);
        setStage("unlock_method_setup");
        setView("onboarding");
        toast.success("Account created! Let's get your secure unlock set up.");
      } catch (error) {
        failWith(error, "E2EE setup failed");
      }
    };

    initialize();
  }, [isReady, failWith, processCallback, navigate]);

  useEffect(() => {
    if (view === "passkey" && !isCheckingPasskeySupport && !passkeySupported) {
      setView("password");
    }
  }, [isCheckingPasskeySupport, passkeySupported, view]);

  const handleSetupPassword = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setPasswordError(null);

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      const masterKey = getDecryptedMasterKey();
      if (!masterKey) {
        throw new Error("Master key not available");
      }
      await setupPasswordEncryption(password, masterKey);
      toast.success("Encryption password set");
      setStage("recovery_ack");
      setView("recovery");
    } catch (error) {
      setPasswordError(normalizeAppError(error, "Failed to set password").userMessage);
    }
  };

  const handleRegisterPasskey = async (): Promise<void> => {
    setPasskeyError(null);
    try {
      const masterKey = getDecryptedMasterKey();
      if (!masterKey) {
        throw new Error("Master key not available");
      }
      await registerPasskey(masterKey, getDeviceName());
      toast.success("Passkey registered");
      setStage("recovery_ack");
      setView("recovery");
    } catch (error) {
      const normalized = normalizeAppError(error, "Passkey registration failed");
      const isCancellation =
        normalized.message.includes("cancel") || normalized.message.includes("NotAllowedError");
      if (!isCancellation) {
        setPasskeyError(normalized.userMessage);
      }
    }
  };

  if (view === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <Card className="w-full max-w-md bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Completing sign in...</p>
            <p className="mt-2 text-xs text-muted-foreground/80" aria-live="polite">
              {stageLabel}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <Card className="w-full max-w-md bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Sign In Failed</CardTitle>
            <CardDescription aria-live="assertive">{stageLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage || "An error occurred during sign in"}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate({ to: "/auth" })} className="w-full">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "onboarding") {
    return (
      <OnboardingFlow
        onComplete={() => {
          if (!isCheckingPasskeySupport && passkeySupported) {
            setView("passkey");
            return;
          }
          setView("password");
        }}
      />
    );
  }

  if (view === "recovery" && recoveryInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-gray-850 p-6 sm:p-8 border border-gray-100 dark:border-gray-850">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/10 ring-1 ring-amber-500/20">
              <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Backup Recovery Phrase</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Save this phrase securely in case you lose your passkey or password.
            </p>
          </div>

          <Card className="border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-850/50 shadow-md">
            <CardContent className="p-4 sm:p-6">
              <RecoveryPhraseDisplay
                recoveryInfo={recoveryInfo}
                onContinue={() => {
                  trpcUtils.keyShares.getOnboardingStatus.invalidate();
                  setStage("done");
                  navigate({ to: "/app" });
                }}
                continueLabel="Start Chatting"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "password") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <Card className="bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Set Encryption Password</CardTitle>
                <CardDescription>This password unlocks your encrypted data.</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSetupPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter a strong password"
                      required
                      autoFocus
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters. This is separate from your account password.
                </p>

                {passwordError && (
                  <Alert variant="destructive" aria-live="assertive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={isSettingUpPassword}>
                  {isSettingUpPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Set Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (view === "passkey") {
    if (isCheckingPasskeySupport) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
          <Card className="w-full max-w-md bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Checking device capabilities...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!passkeySupported) {
      return null;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <Card className="bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-850">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Add a Passkey</CardTitle>
                <CardDescription>Unlock using Face ID, Touch ID, or Windows Hello.</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-850">
                  <Fingerprint className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Instant unlock</p>
                    <p className="text-xs text-muted-foreground">
                      Use one biometric gesture to unlock encrypted data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-850">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Phishing resistant</p>
                    <p className="text-xs text-muted-foreground">
                      Passkeys stay bound to your device identity.
                    </p>
                  </div>
                </div>
              </div>

              {passkeyError && (
                <Alert variant="destructive" aria-live="assertive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{passkeyError}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleRegisterPasskey} disabled={isRegisteringPasskey} className="w-full">
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

              <button
                type="button"
                onClick={() => setView("password")}
                disabled={isRegisteringPasskey}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Use password instead
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
