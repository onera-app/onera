import { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useE2EEStore, type E2EEStatus } from '@/stores/e2eeStore';
import {
  initializeE2EE,
  isUnlocked,
  lock,
  tryRestoreSession,
  extendSession,
  getMasterKey,
  getPrivateKey,
  getPublicKey,
  subscribe as subscribeToCrypto,
} from '@cortex/crypto';
import { clearAllAICaches } from '@/lib/ai';

interface E2EEContextValue {
  status: E2EEStatus;
  error: string | null;
  ready: boolean;
  needsSetup: boolean;
  isUnlocked: boolean;

  // Key access
  getMasterKey: () => Uint8Array;
  getPrivateKey: () => Uint8Array;
  getPublicKey: () => Uint8Array;

  // Actions
  lock: () => void;
  extendSession: () => void;
}

const E2EEContext = createContext<E2EEContextValue | null>(null);

export function E2EEProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const {
    status,
    error,
    ready,
    needsSetup,
    setStatus,
    setReady,
    setNeedsSetup,
    setError,
  } = useE2EEStore();

  // Check if user has keys using Convex
  const userKeysCheck = useQuery(
    api.userKeys.check,
    isAuthenticated ? {} : 'skip'
  );

  // Initialize E2EE and subscribe to state changes
  useEffect(() => {
    const init = async () => {
      try {
        await initializeE2EE();

        // Try to restore session
        await tryRestoreSession();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize E2EE');
        setStatus('error');
      }
    };

    // Subscribe to crypto state changes
    const unsubscribe = subscribeToCrypto((cryptoState) => {
      setReady(cryptoState.ready);
      setStatus(cryptoState.status as E2EEStatus);
      setError(cryptoState.error);
    });

    init();

    return () => unsubscribe();
  }, [setReady, setStatus, setError]);

  // Update needsSetup based on Convex query result
  useEffect(() => {
    if (!isAuthenticated || !ready) return;

    if (userKeysCheck !== undefined) {
      setNeedsSetup(!userKeysCheck.hasKeys);
    }
  }, [isAuthenticated, ready, userKeysCheck, setNeedsSetup]);

  // Extend session on user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => {
      if (isUnlocked()) {
        extendSession();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, handler, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handler);
      });
    };
  }, []);

  const handleLock = useCallback(() => {
    // Clear AI caches to remove decrypted credentials from memory
    clearAllAICaches();
    lock();
    setStatus('locked');
  }, [setStatus]);

  // Derive isUnlocked from reactive status (not the sync function)
  // This ensures React re-renders when status changes
  const isUnlockedValue = status === 'unlocked';

  const value: E2EEContextValue = {
    status,
    error,
    ready,
    needsSetup,
    isUnlocked: isUnlockedValue,

    getMasterKey,
    getPrivateKey,
    getPublicKey,

    lock: handleLock,
    extendSession,
  };

  return <E2EEContext.Provider value={value}>{children}</E2EEContext.Provider>;
}

export function useE2EE() {
  const context = useContext(E2EEContext);
  if (!context) {
    throw new Error('useE2EE must be used within E2EEProvider');
  }
  return context;
}
