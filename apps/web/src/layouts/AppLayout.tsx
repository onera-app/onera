import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useUINavigationStore } from "@/stores/uiNavigationStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { E2EEUnlockModal } from "@/components/e2ee/E2EEUnlockModal";
import { E2EESetupModal } from "@/components/e2ee/E2EESetupModal";
import { OnboardingCompletionModal } from "@/components/e2ee/OnboardingCompletionModal";
import { SettingsModal } from "@/features/settings-modal";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useFlowState } from "@/hooks/useFlowState";
import { useEnclaveSession } from "@/hooks/useEnclaveSession";

export function AppLayout() {
  const navigate = useNavigate();
  const { state, redirectTo, shouldShowSetup, shouldShowUnlock, shouldShowOnboardingCompletion } =
    useFlowState();
  const {
    chatDensity,
    settingsModalOpen,
    settingsModalTab,
    closeSettingsModal,
  } = useUIStore();
  const setActiveModal = useUINavigationStore((state) => state.setActiveModal);

  // Manage enclave lifecycle at layout level (trust badge, eager attestation)
  useEnclaveSession();

  // Track if user has completed onboarding in this session (to avoid showing modal again)
  const [onboardingCompletedThisSession, setOnboardingCompletedThisSession] =
    useState(false);

  // Centralized route guard handling
  useEffect(() => {
    if (redirectTo) {
      navigate({ to: redirectTo });
    }
  }, [navigate, redirectTo]);

  useEffect(() => {
    if (shouldShowSetup) {
      setActiveModal("e2ee_setup");
      return;
    }
    if (shouldShowUnlock) {
      setActiveModal("e2ee_unlock");
      return;
    }
    if (shouldShowOnboardingCompletion && !onboardingCompletedThisSession) {
      setActiveModal("onboarding_completion");
      return;
    }
    if (settingsModalOpen) {
      setActiveModal("settings");
      return;
    }
    setActiveModal(null);
  }, [
    onboardingCompletedThisSession,
    setActiveModal,
    settingsModalOpen,
    shouldShowOnboardingCompletion,
    shouldShowSetup,
    shouldShowUnlock,
  ]);

  // Show loading state
  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-gray-800 border-t-gray-600 dark:border-t-gray-400 animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (state.kind === "unauthenticated") {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 h-[100dvh] overflow-hidden flex flex-row",
          `chat-density-${chatDensity}`,
        )}
      >
        {/* Sidebar */}
        <Sidebar />

        {/* Resize handle */}
        <ResizeHandle />

        {/* Main content */}
        <main className="flex-1 overflow-hidden relative flex flex-col min-w-0 max-w-full">
          <Outlet />
        </main>

        {/* E2EE Setup Modal */}
        {shouldShowSetup && <E2EESetupModal />}

        {/* E2EE Unlock Modal */}
        {shouldShowUnlock && <E2EEUnlockModal />}

        {/* Onboarding Completion Modal */}
        {shouldShowOnboardingCompletion && !onboardingCompletedThisSession && (
          <OnboardingCompletionModal
            open={true}
            onComplete={() => setOnboardingCompletedThisSession(true)}
          />
        )}

        {/* Settings Modal */}
        <SettingsModal
          open={settingsModalOpen}
          onOpenChange={(open) => !open && closeSettingsModal()}
          initialTab={settingsModalTab}
        />
      </div>
    </TooltipProvider>
  );
}
