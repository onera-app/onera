import { create } from 'zustand';
import { clearAllAICaches } from '@/lib/ai';

// Note: This store is now a compatibility layer for legacy code.
// New code should use the useAuth hook from @/hooks/useAuth
// which wraps Convex Auth directly.

interface AuthState {
  // Legacy state - kept for compatibility during migration
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;

  // Legacy logout action - clears local caches
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    // Clear AI caches (credentials, providers) before clearing auth
    clearAllAICaches();
    // Clear E2EE session on logout
    localStorage.removeItem('e2ee_session_master_key');
    localStorage.removeItem('e2ee_session_private_key');
    sessionStorage.removeItem('e2ee_session_key');
    // Clear legacy storage
    localStorage.removeItem('onera-auth');
  },
}));
