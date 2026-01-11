import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'convex/_generated/api';
import { clearAllAICaches } from '@/lib/ai';

/**
 * Hook for authentication using Convex Auth
 */
export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const user = useQuery(api.users.me);

  const handleSignOut = async () => {
    // Clear AI caches (credentials, providers) before signing out
    clearAllAICaches();
    // Clear E2EE session on logout
    localStorage.removeItem('e2ee_session_master_key');
    localStorage.removeItem('e2ee_session_private_key');
    sessionStorage.removeItem('e2ee_session_key');
    // Sign out from Convex Auth
    await signOut();
  };

  const handleSignIn = async (
    email: string,
    password: string,
    flow: 'signIn' | 'signUp'
  ) => {
    await signIn('password', { email, password, flow });
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
