import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useE2EEStore } from "@/stores/e2eeStore";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useSessionFlowStore } from "@/stores/sessionFlowStore";

export type FlowState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "needs_setup" }
  | { kind: "locked" }
  | { kind: "unlocking" }
  | { kind: "onboarding_incomplete" }
  | { kind: "ready" };

export interface FlowStateResult {
  state: FlowState;
  redirectTo: "/auth" | "/app" | null;
  shouldShowSetup: boolean;
  shouldShowUnlock: boolean;
  shouldShowOnboardingCompletion: boolean;
}

export function useFlowState(): FlowStateResult {
  const { isAuthenticated, isLoading } = useAuth();
  const { status, needsSetup } = useE2EEStore();
  const setFlow = useSessionFlowStore((state) => state.setFlow);

  const onboarding = useOnboardingStatus(
    isAuthenticated && status === "unlocked" && !needsSetup,
  );

  const result = useMemo<FlowStateResult>(() => {
    if (isLoading) {
      return {
        state: { kind: "loading" } as FlowState,
        redirectTo: null,
        shouldShowSetup: false,
        shouldShowUnlock: false,
        shouldShowOnboardingCompletion: false,
      };
    }

    if (!isAuthenticated) {
      return {
        state: { kind: "unauthenticated" } as FlowState,
        redirectTo: "/auth",
        shouldShowSetup: false,
        shouldShowUnlock: false,
        shouldShowOnboardingCompletion: false,
      };
    }

    if (needsSetup) {
      return {
        state: { kind: "needs_setup" } as FlowState,
        redirectTo: null,
        shouldShowSetup: true,
        shouldShowUnlock: false,
        shouldShowOnboardingCompletion: false,
      };
    }

    if (status === "locked") {
      return {
        state: { kind: "locked" } as FlowState,
        redirectTo: null,
        shouldShowSetup: false,
        shouldShowUnlock: true,
        shouldShowOnboardingCompletion: false,
      };
    }

    if (status === "unlocking") {
      return {
        state: { kind: "unlocking" } as FlowState,
        redirectTo: null,
        shouldShowSetup: false,
        shouldShowUnlock: true,
        shouldShowOnboardingCompletion: false,
      };
    }

    if (status === "unlocked" && !onboarding.isLoading && !onboarding.onboardingComplete) {
      return {
        state: { kind: "onboarding_incomplete" } as FlowState,
        redirectTo: null,
        shouldShowSetup: false,
        shouldShowUnlock: false,
        shouldShowOnboardingCompletion: true,
      };
    }

    return {
      state: { kind: "ready" } as FlowState,
      redirectTo: null,
      shouldShowSetup: false,
      shouldShowUnlock: false,
      shouldShowOnboardingCompletion: false,
    };
  }, [
    isAuthenticated,
    isLoading,
    needsSetup,
    onboarding.isLoading,
    onboarding.onboardingComplete,
    status,
  ]);

  useEffect(() => {
    setFlow(result.state.kind, result.redirectTo);
  }, [result.redirectTo, result.state.kind, setFlow]);

  return result;
}
