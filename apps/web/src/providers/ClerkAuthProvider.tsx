/**
 * Clerk Authentication Provider
 * Handles Clerk authentication and integrates with the Privy-style E2EE key system
 *
 * SECURITY MODEL:
 * - Auth share is stored plaintext on server, protected by Clerk authentication
 * - Device share requires server-provided entropy (deviceSecret)
 * - New device login requires recovery phrase (no vulnerable login key shortcut)
 */

import {
  ClerkProvider,
  useUser,
  useAuth as useClerkAuth,
  useSignIn,
  useSignUp,
} from "@clerk/clerk-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  setupUserKeysWithSharding,
  unlockWithRecoveryPhrase,
  getOrCreateDeviceId,
  setDecryptedKeys,
  clearSession as clearCryptoSession,
  type RecoveryKeyInfo,
} from "@onera/crypto";
import { useE2EEStore } from "@/stores/e2eeStore";
import { trpc } from "@/lib/trpc";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

/**
 * User type for the auth context
 */
interface User {
  id: string;
  email: string;
  name: string;
  imageUrl?: string | null;
  emailVerified: boolean;
}

/**
 * Auth context type
 */
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Inner auth provider that uses Clerk hooks
 */
function ClerkAuthContextProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn, getToken, signOut: clerkSignOut } = useClerkAuth();
  const [user, setUser] = useState<User | null>(null);
  const e2eeStore = useE2EEStore();
  const trpcUtils = trpc.useUtils();

  // Map Clerk user to our user type
  useEffect(() => {
    if (isUserLoaded && clerkUser) {
      setUser({
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name:
          clerkUser.fullName ||
          clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
          "User",
        imageUrl: clerkUser.imageUrl,
        emailVerified:
          clerkUser.primaryEmailAddress?.verification?.status === "verified",
      });
    } else if (isUserLoaded && !clerkUser) {
      setUser(null);
    }
  }, [clerkUser, isUserLoaded]);

  // Clear all E2EE state
  const clearE2EEState = useCallback(async () => {
    await clearCryptoSession();
    e2eeStore.reset();
    await trpcUtils.invalidate();
  }, [e2eeStore, trpcUtils]);

  const signOut = useCallback(async () => {
    await clearE2EEState();
    // Keep device data for future logins (device share is user-specific)
    await clerkSignOut();
    setUser(null);
  }, [clearE2EEState, clerkSignOut]);

  const refetch = useCallback(async () => {
    // Clerk handles session refresh automatically
  }, []);

  const value: AuthContextType = {
    user,
    isLoading: !isUserLoaded,
    // Only consider authenticated when both user exists AND session is signed in
    // This ensures getToken() will return a valid token
    isAuthenticated: !!clerkUser && !!isSignedIn,
    isSignedIn: isSignedIn || false,
    getToken,
    signOut,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Main Clerk provider wrapper (just ClerkProvider, no tRPC dependency)
 */
export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  );
}

/**
 * Auth context provider that uses tRPC - must be rendered inside TRPCProvider
 */
export function AuthContextProvider({ children }: { children: ReactNode }) {
  return <ClerkAuthContextProvider>{children}</ClerkAuthContextProvider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within ClerkAuthProvider");
  }
  return context;
}

/**
 * Hook for sign-up flow with E2EE key setup
 */
export function useSignUpWithE2EE() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createKeySharesMutation = trpc.keyShares.create.useMutation();
  const registerDeviceMutation = trpc.devices.register.useMutation();

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      name?: string
    ): Promise<{ recoveryInfo: RecoveryKeyInfo; pendingVerification: boolean }> => {
      if (!isLoaded || !signUp) {
        throw new Error("Clerk is not loaded");
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Create Clerk account
        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName: name?.split(" ")[0],
          lastName: name?.split(" ").slice(1).join(" "),
        });

        // Check if email verification is required
        if (result.status === "missing_requirements") {
          // Start email verification
          await signUp.prepareEmailAddressVerification({
            strategy: "email_code",
          });

          // We need to return here and wait for verification
          return {
            recoveryInfo: {
              mnemonic: "",
              formattedGroups: [],
              wordCount: 0,
            },
            pendingVerification: true,
          };
        }

        // 2. Set the session
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }

        // 3. Register device and get device secret FIRST
        const deviceId = getOrCreateDeviceId();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        });

        // 4. Setup E2EE keys with sharding (using device secret from server)
        const keyBundle = await setupUserKeysWithSharding(deviceResult.deviceSecret);

        // 5. Store key shares in database (using Privy-style plaintext auth share)
        await createKeySharesMutation.mutateAsync({
          authShare: keyBundle.storableKeys.authShare,
          encryptedRecoveryShare: keyBundle.storableKeys.encryptedRecoveryShare,
          recoveryShareNonce: keyBundle.storableKeys.recoveryShareNonce,
          publicKey: keyBundle.storableKeys.publicKey,
          encryptedPrivateKey: keyBundle.storableKeys.encryptedPrivateKey,
          privateKeyNonce: keyBundle.storableKeys.privateKeyNonce,
          masterKeyRecovery: keyBundle.storableKeys.masterKeyRecovery,
          masterKeyRecoveryNonce: keyBundle.storableKeys.masterKeyRecoveryNonce,
          encryptedRecoveryKey: keyBundle.storableKeys.encryptedRecoveryKey,
          recoveryKeyNonce: keyBundle.storableKeys.recoveryKeyNonce,
        });

        // 6. Set master key and key pair in crypto session
        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        return {
          recoveryInfo: keyBundle.recoveryInfo,
          pendingVerification: false,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign up failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded, signUp, setActive, createKeySharesMutation, registerDeviceMutation]
  );

  const verifyEmail = useCallback(
    async (code: string): Promise<{ recoveryInfo: RecoveryKeyInfo }> => {
      if (!isLoaded || !signUp) {
        throw new Error("Clerk is not loaded");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Verify the email
        const result = await signUp.attemptEmailAddressVerification({
          code,
        });

        if (result.status !== "complete") {
          throw new Error("Email verification failed");
        }

        // Set the session
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }

        // Register device and get device secret FIRST
        const deviceId = getOrCreateDeviceId();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        });

        // Setup E2EE keys with device secret
        const keyBundle = await setupUserKeysWithSharding(deviceResult.deviceSecret);

        await createKeySharesMutation.mutateAsync({
          authShare: keyBundle.storableKeys.authShare,
          encryptedRecoveryShare: keyBundle.storableKeys.encryptedRecoveryShare,
          recoveryShareNonce: keyBundle.storableKeys.recoveryShareNonce,
          publicKey: keyBundle.storableKeys.publicKey,
          encryptedPrivateKey: keyBundle.storableKeys.encryptedPrivateKey,
          privateKeyNonce: keyBundle.storableKeys.privateKeyNonce,
          masterKeyRecovery: keyBundle.storableKeys.masterKeyRecovery,
          masterKeyRecoveryNonce: keyBundle.storableKeys.masterKeyRecoveryNonce,
          encryptedRecoveryKey: keyBundle.storableKeys.encryptedRecoveryKey,
          recoveryKeyNonce: keyBundle.storableKeys.recoveryKeyNonce,
        });

        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        return {
          recoveryInfo: keyBundle.recoveryInfo,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Email verification failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoaded, signUp, setActive, createKeySharesMutation, registerDeviceMutation]
  );

  return {
    isLoaded,
    isLoading,
    error,
    signUpWithEmail,
    verifyEmail,
  };
}

/**
 * Hook for sign-in flow with E2EE key unlock
 *
 * SECURITY: New device login requires recovery phrase.
 * The old "login key" shortcut (user-ID-derived encryption) was removed as a security vulnerability.
 */
export function useSignInWithE2EE() {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresRecoveryPhrase, setRequiresRecoveryPhrase] = useState(false);
  const [pendingKeyShares, setPendingKeyShares] = useState<{
    masterKeyRecovery: string;
    masterKeyRecoveryNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  } | null>(null);

  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    enabled: false,
  });
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  const isLoaded = signInLoaded && signUpLoaded;

  /**
   * Sign in/up with OAuth provider (Google, Apple)
   * Uses signUp which handles both new and existing users via OAuth
   */
  const signInWithOAuth = useCallback(
    async (provider: "oauth_google" | "oauth_apple"): Promise<void> => {
      if (!isLoaded || !signUp) {
        throw new Error("Clerk is not loaded");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use signUp for OAuth - it handles both new users and existing users
        // (existing users are automatically transferred to sign-in flow)
        await signUp.authenticateWithRedirect({
          strategy: provider,
          redirectUrl: "/auth/sso-callback",
          redirectUrlComplete: "/auth/sso-callback",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "SSO sign in failed";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [isLoaded, signUp]
  );

  /**
   * Sign in with email/password
   * Returns true if sign-in successful and E2EE unlocked
   * Sets requiresRecoveryPhrase=true if user needs to enter recovery phrase
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ requiresRecoveryPhrase: boolean }> => {
      if (!isLoaded || !signIn) {
        throw new Error("Clerk is not loaded");
      }

      setIsLoading(true);
      setError(null);
      setRequiresRecoveryPhrase(false);

      try {
        // 1. Sign in with Clerk
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status !== "complete") {
          // Handle MFA or other requirements
          throw new Error("Additional authentication required");
        }

        // 2. Set the session
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }

        // 3. Fetch key shares
        const keysResult = await keySharesQuery.refetch();
        if (!keysResult.data) {
          throw new Error("Failed to fetch key shares");
        }

        const keyShares = keysResult.data;

        // 4. Store key shares for recovery phrase unlock
        setPendingKeyShares({
          masterKeyRecovery: keyShares.masterKeyRecovery,
          masterKeyRecoveryNonce: keyShares.masterKeyRecoveryNonce,
          encryptedPrivateKey: keyShares.encryptedPrivateKey,
          privateKeyNonce: keyShares.privateKeyNonce,
          publicKey: keyShares.publicKey,
        });

        // 5. Require recovery phrase for unlock
        // (The old login key shortcut was a security vulnerability)
        setRequiresRecoveryPhrase(true);
        setIsLoading(false);

        return { requiresRecoveryPhrase: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    [isLoaded, signIn, setActive, keySharesQuery]
  );

  /**
   * Complete sign-in by unlocking with recovery phrase
   */
  const unlockWithMnemonic = useCallback(
    async (mnemonic: string): Promise<void> => {
      if (!pendingKeyShares) {
        throw new Error("No pending sign-in. Please sign in first.");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Unlock using recovery phrase
        const decryptedKeys = unlockWithRecoveryPhrase(mnemonic, pendingKeyShares);

        // Set keys in crypto session
        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        // Update device last seen
        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

        // Clear pending state
        setPendingKeyShares(null);
        setRequiresRecoveryPhrase(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid recovery phrase";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [pendingKeyShares, updateLastSeenMutation]
  );

  return {
    isLoaded,
    isLoading,
    error,
    requiresRecoveryPhrase,
    signInWithEmail,
    signInWithOAuth,
    unlockWithMnemonic,
  };
}

/**
 * Hook to handle SSO callback and E2EE key setup
 */
export function useSSOCallback() {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn, isLoaded: isAuthLoaded } = useClerkAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresRecoveryPhrase, setRequiresRecoveryPhrase] = useState(false);
  const [pendingKeyShares, setPendingKeyShares] = useState<{
    masterKeyRecovery: string;
    masterKeyRecoveryNonce: string;
    encryptedPrivateKey: string;
    privateKeyNonce: string;
    publicKey: string;
  } | null>(null);

  const keySharesQuery = trpc.keyShares.get.useQuery(undefined, {
    enabled: false,
  });
  const createKeySharesMutation = trpc.keyShares.create.useMutation();
  const registerDeviceMutation = trpc.devices.register.useMutation();
  const updateLastSeenMutation = trpc.devices.updateLastSeen.useMutation();

  const processCallback = useCallback(async (): Promise<{
    isNewUser: boolean;
    recoveryInfo?: RecoveryKeyInfo;
    requiresRecoveryPhrase?: boolean;
  }> => {
    if (!isUserLoaded || !clerkUser || !isSignedIn) {
      throw new Error("Not authenticated");
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if user already has key shares (existing user)
      // The query throws NOT_FOUND for new users, so we catch that
      let keyShares = null;
      try {
        const keysResult = await keySharesQuery.refetch();
        keyShares = keysResult.data;
      } catch (_err) {
        // NOT_FOUND error means new user - this is expected
      }

      if (keyShares) {
        // Existing user - need recovery phrase to unlock
        setPendingKeyShares({
          masterKeyRecovery: keyShares.masterKeyRecovery,
          masterKeyRecoveryNonce: keyShares.masterKeyRecoveryNonce,
          encryptedPrivateKey: keyShares.encryptedPrivateKey,
          privateKeyNonce: keyShares.privateKeyNonce,
          publicKey: keyShares.publicKey,
        });
        setRequiresRecoveryPhrase(true);

        return { isNewUser: false, requiresRecoveryPhrase: true };
      } else {
        // New user - setup E2EE keys

        // Register device and get device secret FIRST
        const deviceId = getOrCreateDeviceId();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        });

        // Setup keys with device secret
        const keyBundle = await setupUserKeysWithSharding(deviceResult.deviceSecret);

        await createKeySharesMutation.mutateAsync({
          authShare: keyBundle.storableKeys.authShare,
          encryptedRecoveryShare: keyBundle.storableKeys.encryptedRecoveryShare,
          recoveryShareNonce: keyBundle.storableKeys.recoveryShareNonce,
          publicKey: keyBundle.storableKeys.publicKey,
          encryptedPrivateKey: keyBundle.storableKeys.encryptedPrivateKey,
          privateKeyNonce: keyBundle.storableKeys.privateKeyNonce,
          masterKeyRecovery: keyBundle.storableKeys.masterKeyRecovery,
          masterKeyRecoveryNonce: keyBundle.storableKeys.masterKeyRecoveryNonce,
          encryptedRecoveryKey: keyBundle.storableKeys.encryptedRecoveryKey,
          recoveryKeyNonce: keyBundle.storableKeys.recoveryKeyNonce,
        });

        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        return { isNewUser: true, recoveryInfo: keyBundle.recoveryInfo };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "SSO callback failed";
      setError(message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [
    isUserLoaded,
    clerkUser,
    isSignedIn,
    keySharesQuery,
    createKeySharesMutation,
    registerDeviceMutation,
  ]);

  /**
   * Complete SSO login by unlocking with recovery phrase
   */
  const unlockWithMnemonic = useCallback(
    async (mnemonic: string): Promise<void> => {
      if (!pendingKeyShares) {
        throw new Error("No pending sign-in. Please sign in first.");
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Unlock using recovery phrase
        const decryptedKeys = unlockWithRecoveryPhrase(mnemonic, pendingKeyShares);

        // Set keys in crypto session
        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        // Update device last seen
        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

        // Clear pending state
        setPendingKeyShares(null);
        setRequiresRecoveryPhrase(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid recovery phrase";
        setError(message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [pendingKeyShares, updateLastSeenMutation]
  );

  return {
    isReady: isUserLoaded && isAuthLoaded && !!clerkUser && !!isSignedIn,
    isProcessing,
    error,
    requiresRecoveryPhrase,
    processCallback,
    unlockWithMnemonic,
  };
}

/**
 * Get a friendly device name
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Detect browser
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  // Detect OS
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";

  return `${browser} on ${os}`;
}
