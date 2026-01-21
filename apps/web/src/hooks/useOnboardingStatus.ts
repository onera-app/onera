/**
 * Hook for checking user's onboarding status
 * 
 * Derives onboarding state from database to handle users who leave mid-onboarding.
 * A user needs:
 * 1. Key shares (encryption set up)
 * 2. At least one unlock method (passkey OR password)
 */

import { trpc } from '@/lib/trpc';

export interface OnboardingStatus {
  hasKeyShares: boolean;
  hasPasskey: boolean;
  hasPassword: boolean;
  hasUnlockMethod: boolean;
  onboardingComplete: boolean;
  isLoading: boolean;
}

export function useOnboardingStatus(enabled = true): OnboardingStatus {
  const query = trpc.keyShares.getOnboardingStatus.useQuery(undefined, {
    enabled,
    staleTime: 30_000, // Cache for 30 seconds
    retry: false,
  });

  return {
    hasKeyShares: query.data?.hasKeyShares ?? false,
    hasPasskey: query.data?.hasPasskey ?? false,
    hasPassword: query.data?.hasPassword ?? false,
    hasUnlockMethod: query.data?.hasUnlockMethod ?? false,
    onboardingComplete: query.data?.onboardingComplete ?? false,
    isLoading: query.isLoading,
  };
}
