import { create } from 'zustand';

export type E2EEStatus = 'initializing' | 'locked' | 'unlocking' | 'unlocked' | 'error';

interface E2EEState {
  status: E2EEStatus;
  error: string | null;
  ready: boolean;
  needsSetup: boolean;

  // Actions
  setStatus: (status: E2EEStatus) => void;
  setError: (error: string | null) => void;
  setReady: (ready: boolean) => void;
  setNeedsSetup: (needsSetup: boolean) => void;
  reset: () => void;
}

export const useE2EEStore = create<E2EEState>((set) => ({
  status: 'initializing',
  error: null,
  ready: false,
  needsSetup: false,

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setReady: (ready) => set({ ready }),
  setNeedsSetup: (needsSetup) => set({ needsSetup }),

  reset: () =>
    set({
      status: 'initializing',
      error: null,
      ready: false,
      needsSetup: false,
    }),
}));
