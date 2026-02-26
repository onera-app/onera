/**
 * Supabase Authentication Provider
 * Handles Supabase Auth and integrates with the Privy-style E2EE key system
 *
 * Replaces ClerkAuthProvider. Maintains the same hook interfaces:
 * - useAuth() — user, isLoading, isAuthenticated, getToken, signOut
 * - useSignUpWithE2EE() — sign up with E2EE key setup
 * - useSignInWithE2EE() — sign in with E2EE key unlock
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  setupUserKeysWithSharding,
  unlockWithRecoveryPhrase,
  getOrCreateDeviceId,
  setDecryptedKeys,
  clearSession as clearCryptoSession,
  encryptDeviceName,
  type RecoveryKeyInfo,
} from "@onera/crypto";
import { useE2EEStore } from "@/stores/e2eeStore";
import { trpc } from "@/lib/trpc";
import { analytics } from "@/lib/analytics";

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
 * Map Supabase session to our User type
 */
function mapSessionToUser(session: Session): User {
  const supaUser = session.user;
  const metadata = supaUser.user_metadata || {};
  const email = supaUser.email || "";
  const firstName = metadata.first_name || metadata.name?.split(" ")[0] || "";
  const lastName = metadata.last_name || metadata.name?.split(" ").slice(1).join(" ") || "";

  return {
    id: supaUser.id,
    email,
    name:
      [firstName, lastName].filter(Boolean).join(" ") ||
      metadata.full_name ||
      email.split("@")[0] ||
      "User",
    imageUrl: metadata.avatar_url || metadata.picture || null,
    emailVerified: !!supaUser.email_confirmed_at,
  };
}

/**
 * Main Supabase auth provider
 */
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const e2eeStore = useE2EEStore();

  // Initialize session and listen for auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        setUser(mapSessionToUser(initialSession));
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const mapped = mapSessionToUser(newSession);
        setUser(mapped);
        // Identify user in PostHog so events are attributed
        analytics.identify(mapped.id, {
          email: mapped.email,
          name: mapped.name,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await clearCryptoSession();
    e2eeStore.reset();
    analytics.reset();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [e2eeStore]);

  const refetch = useCallback(async () => {
    const { data: { session: refreshed } } = await supabase.auth.getSession();
    setSession(refreshed);
    if (refreshed) {
      setUser(mapSessionToUser(refreshed));
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!session && !!user,
    isSignedIn: !!session,
    getToken,
    signOut,
    refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within SupabaseAuthProvider");
  }
  return context;
}

/**
 * Hook for sign-up flow with E2EE key setup
 */
export function useSignUpWithE2EE() {
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
      setIsLoading(true);
      setError(null);

      try {
        const firstName = name?.split(" ")[0];
        const lastName = name?.split(" ").slice(1).join(" ");

        // 1. Create Supabase account
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              name,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required
          return {
            recoveryInfo: {
              mnemonic: "",
              formattedGroups: [],
              wordCount: 0,
            },
            pendingVerification: true,
          };
        }

        if (!data.session) {
          throw new Error("Sign up failed — no session created");
        }

        // 2. Register device and get device secret
        const deviceId = getOrCreateDeviceId();
        const plaintextDeviceName = getDeviceName();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          userAgent: navigator.userAgent,
        });

        // 3. Setup E2EE keys with sharding
        const keyBundle = await setupUserKeysWithSharding(deviceResult.deviceSecret);

        // 4. Store key shares in database
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

        // 5. Set master key and key pair in crypto session
        setDecryptedKeys({
          masterKey: keyBundle.masterKey,
          publicKey: keyBundle.keyPair.publicKey,
          privateKey: keyBundle.keyPair.privateKey,
        });

        // 6. Encrypt the device name
        try {
          const encryptedName = encryptDeviceName(plaintextDeviceName);
          await registerDeviceMutation.mutateAsync({
            deviceId,
            encryptedDeviceName: encryptedName.encryptedDeviceName,
            deviceNameNonce: encryptedName.deviceNameNonce,
            userAgent: navigator.userAgent,
          });
        } catch (err) {
          console.warn("Failed to encrypt device name:", err);
        }

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
    [createKeySharesMutation, registerDeviceMutation]
  );

  return {
    isLoaded: true,
    isLoading,
    error,
    signUpWithEmail,
  };
}

/**
 * Hook for sign-in flow with E2EE key unlock
 */
export function useSignInWithE2EE() {
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

  /**
   * Sign in with email/password
   */
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ requiresRecoveryPhrase: boolean }> => {
      setIsLoading(true);
      setError(null);
      setRequiresRecoveryPhrase(false);

      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Fetch key shares
        const keysResult = await keySharesQuery.refetch();
        if (!keysResult.data) {
          throw new Error("Failed to fetch key shares");
        }

        const keyShares = keysResult.data;

        setPendingKeyShares({
          masterKeyRecovery: keyShares.masterKeyRecovery,
          masterKeyRecoveryNonce: keyShares.masterKeyRecoveryNonce,
          encryptedPrivateKey: keyShares.encryptedPrivateKey,
          privateKeyNonce: keyShares.privateKeyNonce,
          publicKey: keyShares.publicKey,
        });

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
    [keySharesQuery]
  );

  /**
   * Sign in/up with OAuth provider (Google, Apple)
   */
  const signInWithOAuth = useCallback(
    async (provider: "oauth_google" | "oauth_apple"): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Map Clerk provider names to Supabase provider names
        const supabaseProvider = provider === "oauth_google" ? "google" : "apple";

        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: supabaseProvider as "google" | "apple",
          options: {
            redirectTo: `${window.location.origin}/auth/sso-callback`,
          },
        });

        if (oauthError) throw oauthError;
      } catch (err) {
        const message = err instanceof Error ? err.message : "SSO sign in failed";
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
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
        const decryptedKeys = unlockWithRecoveryPhrase(mnemonic, pendingKeyShares);

        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

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
    isLoaded: true,
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
  const { isAuthenticated, user } = useAuth();
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
    if (!isAuthenticated || !user) {
      throw new Error("Not authenticated");
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if user already has key shares (existing user)
      let keyShares = null;
      try {
        const keysResult = await keySharesQuery.refetch();
        keyShares = keysResult.data;
      } catch {
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
        const deviceId = getOrCreateDeviceId();
        const plaintextDeviceName = getDeviceName();
        const deviceResult = await registerDeviceMutation.mutateAsync({
          deviceId,
          userAgent: navigator.userAgent,
        });

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

        try {
          const encryptedName = encryptDeviceName(plaintextDeviceName);
          await registerDeviceMutation.mutateAsync({
            deviceId,
            encryptedDeviceName: encryptedName.encryptedDeviceName,
            deviceNameNonce: encryptedName.deviceNameNonce,
            userAgent: navigator.userAgent,
          });
        } catch (err) {
          console.warn("Failed to encrypt device name:", err);
        }

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
    isAuthenticated,
    user,
    keySharesQuery,
    createKeySharesMutation,
    registerDeviceMutation,
  ]);

  const unlockWithMnemonic = useCallback(
    async (mnemonic: string): Promise<void> => {
      if (!pendingKeyShares) {
        throw new Error("No pending sign-in. Please sign in first.");
      }

      setIsProcessing(true);
      setError(null);

      try {
        const decryptedKeys = unlockWithRecoveryPhrase(mnemonic, pendingKeyShares);

        setDecryptedKeys({
          masterKey: decryptedKeys.masterKey,
          publicKey: decryptedKeys.publicKey,
          privateKey: decryptedKeys.privateKey,
        });

        const deviceId = getOrCreateDeviceId();
        await updateLastSeenMutation.mutateAsync({ deviceId });

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
    isReady: isAuthenticated && !!user,
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
