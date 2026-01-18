/**
 * WebAuthn Support Detection Hook
 *
 * Detects browser and device support for:
 * - WebAuthn API (basic passkey support)
 * - PRF extension (for E2EE key derivation)
 * - Platform authenticator (Touch ID, Face ID, Windows Hello)
 */

import { useState, useEffect } from "react";
import { checkWebAuthnPRFSupport, type PRFSupportResult } from "@onera/crypto/webauthn";

export interface WebAuthnSupportState extends PRFSupportResult {
  /** Whether the support check has completed */
  isLoading: boolean;
  /** Error message if support check failed */
  error: string | null;
}

const initialState: WebAuthnSupportState = {
  webauthnAvailable: false,
  prfAvailable: false,
  platformAuthenticatorAvailable: false,
  isLoading: true,
  error: null,
};

/**
 * Hook to detect WebAuthn and PRF extension support
 *
 * @returns Object with support status and loading state
 *
 * @example
 * ```tsx
 * const { prfAvailable, platformAuthenticatorAvailable, isLoading } = useWebAuthnSupport();
 *
 * if (isLoading) return <LoadingSpinner />;
 *
 * if (prfAvailable && platformAuthenticatorAvailable) {
 *   return <PasskeyRegistration />;
 * } else {
 *   return <PasswordFallback />;
 * }
 * ```
 */
export function useWebAuthnSupport(): WebAuthnSupportState {
  const [state, setState] = useState<WebAuthnSupportState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function checkSupport() {
      try {
        const result = await checkWebAuthnPRFSupport();

        if (isMounted) {
          setState({
            ...result,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setState({
            webauthnAvailable: false,
            prfAvailable: false,
            platformAuthenticatorAvailable: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to check WebAuthn support",
          });
        }
      }
    }

    checkSupport();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

/**
 * Check if passkey-based E2EE is fully supported
 * Returns true only if PRF extension is available on a platform authenticator
 */
export function usePasskeySupport(): {
  isSupported: boolean;
  isLoading: boolean;
  reason: string | null;
} {
  const support = useWebAuthnSupport();

  if (support.isLoading) {
    return { isSupported: false, isLoading: true, reason: null };
  }

  if (support.error) {
    return { isSupported: false, isLoading: false, reason: support.error };
  }

  if (!support.webauthnAvailable) {
    return {
      isSupported: false,
      isLoading: false,
      reason: "WebAuthn is not supported in this browser",
    };
  }

  if (!support.platformAuthenticatorAvailable) {
    return {
      isSupported: false,
      isLoading: false,
      reason:
        "No platform authenticator (Touch ID, Face ID, Windows Hello) available",
    };
  }

  if (!support.prfAvailable) {
    return {
      isSupported: false,
      isLoading: false,
      reason: "PRF extension is not supported. Please update your browser.",
    };
  }

  return { isSupported: true, isLoading: false, reason: null };
}
