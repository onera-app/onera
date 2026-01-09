import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@cortex/types';
import { clearAllAICaches } from '@/lib/ai';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setIsLoading: (isLoading) => set({ isLoading }),

      login: (token, user) => set({ token, user, isLoading: false }),

      logout: () => {
        // Clear AI caches (credentials, providers) before clearing auth
        clearAllAICaches();
        set({ token: null, user: null });
        // Clear E2EE session on logout
        localStorage.removeItem('e2ee_session_master_key');
        localStorage.removeItem('e2ee_session_private_key');
        sessionStorage.removeItem('e2ee_session_key');
      },
    }),
    {
      name: 'cortex-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setIsLoading(false);
        }
      },
    }
  )
);
