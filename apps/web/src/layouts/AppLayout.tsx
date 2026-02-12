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

  // Show loading state - minimal Apple-style spinner
  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-white/[0.08] border-t-white/40 animate-spin" />
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
          "flex h-dvh w-full bg-background relative overflow-x-hidden overflow-y-hidden",
          `chat-density-${chatDensity}`,
        )}
      >
        {/* Ambient Background Effects - Neutral */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-white/5 blur-[100px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-black/5 blur-[100px]" />
        </div>
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

        {/* E2EE Unlock Modal - show when locked or unlocking */}
        {shouldShowUnlock && <E2EEUnlockModal />}

        {/* Onboarding Completion Modal - show when unlocked but no unlock method set up */}
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
