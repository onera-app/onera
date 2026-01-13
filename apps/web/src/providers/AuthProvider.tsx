import { createContext, useContext, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import {
  setupUserKeys,
  unlockWithPasswordFlow,
  clearSession,
  type StorableUserKeys,
  type RecoveryKeyInfo,
} from "@onera/crypto";
import { useE2EEStore } from "@/stores/e2eeStore";
import { trpc } from "@/lib/trpc";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Check if we're in production (relative URL) or development (absolute URL)
const isRelativeUrl = API_URL.startsWith("/");

// For production behind nginx proxy, use empty string (same origin)
// For development, use the full API URL
// Note: better-auth client with empty baseURL will use current origin
export const authClient = createAuthClient({
  baseURL: isRelativeUrl ? "" : API_URL,
});

interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<RecoveryKeyInfo>;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Convert API response to StorableUserKeys format
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
    encryptedRecoveryKey: keys.encryptedRecoveryKey || "",
    recoveryKeyNonce: keys.recoveryKeyNonce || "",
    masterKeyRecovery: keys.masterKeyRecovery || "",
    masterKeyRecoveryNonce: keys.masterKeyRecoveryNonce || "",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const trpcUtils = trpc.useUtils();
  const e2eeStore = useE2EEStore();

  // tRPC mutations for E2EE key management
  const createUserKeysMutation = trpc.userKeys.create.useMutation();
  const userKeysQuery = trpc.userKeys.get.useQuery(undefined, {
    enabled: false, // Only fetch when needed
  });

  const fetchSession = async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        setUser({
          id: session.data.user.id,
          email: session.data.user.email,
          name: session.data.user.name,
          image: session.data.user.image,
          emailVerified: session.data.user.emailVerified,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Clear all E2EE state (crypto session, storage, store, and query cache)
  const clearE2EEState = async () => {
    clearSession();
    localStorage.removeItem("e2ee_session_master_key");
    localStorage.removeItem("e2ee_session_private_key");
    sessionStorage.removeItem("e2ee_session_key");
    e2eeStore.reset();
    await trpcUtils.invalidate();
  };

  const signIn = async (email: string, password: string) => {
    // Clear any existing E2EE state from previous user before signin
    await clearE2EEState();

    // 1. Authenticate with Better Auth
    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign in failed");
    }

    await fetchSession();

    // 2. Fetch user keys and unlock E2EE with the same password
    const keysResult = await userKeysQuery.refetch();
    if (keysResult.data) {
      const storableKeys = toStorableKeys(keysResult.data);
      await unlockWithPasswordFlow(password, storableKeys);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<RecoveryKeyInfo> => {
    // Clear any existing E2EE state from previous user before signup
    await clearE2EEState();

    // 1. Create account with Better Auth
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (result.error) {
      throw new Error(result.error.message || "Sign up failed");
    }

    await fetchSession();

    // 2. Setup E2EE keys using the same password
    const { recoveryInfo, storableKeys } = await setupUserKeys(password);

    // 3. Store the encrypted keys on the server
    await createUserKeysMutation.mutateAsync({
      kekSalt: storableKeys.kekSalt,
      kekOpsLimit: storableKeys.kekOpsLimit,
      kekMemLimit: storableKeys.kekMemLimit,
      encryptedMasterKey: storableKeys.encryptedMasterKey,
      masterKeyNonce: storableKeys.masterKeyNonce,
      publicKey: storableKeys.publicKey,
      encryptedPrivateKey: storableKeys.encryptedPrivateKey,
      privateKeyNonce: storableKeys.privateKeyNonce,
      encryptedRecoveryKey: storableKeys.encryptedRecoveryKey,
      recoveryKeyNonce: storableKeys.recoveryKeyNonce,
      masterKeyRecovery: storableKeys.masterKeyRecovery,
      masterKeyRecoveryNonce: storableKeys.masterKeyRecoveryNonce,
    });

    // Return recovery info so the UI can show it to the user
    return recoveryInfo;
  };

  const signOut = async () => {
    await clearE2EEState();
    await authClient.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refetch: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
