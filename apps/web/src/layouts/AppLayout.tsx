import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useE2EEStore } from "@/stores/e2eeStore";
import { useUIStore } from "@/stores/uiStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { E2EEUnlockModal } from "@/components/e2ee/E2EEUnlockModal";
import { E2EESetupModal } from "@/components/e2ee/E2EESetupModal";
import { OnboardingCompletionModal } from "@/components/e2ee/OnboardingCompletionModal";
import { SettingsModal } from "@/features/settings-modal";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

export function AppLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { status: e2eeStatus, needsSetup } = useE2EEStore();
  const {
    chatDensity,
    settingsModalOpen,
    settingsModalTab,
    closeSettingsModal,
  } = useUIStore();

  // Check onboarding status to detect users who left mid-onboarding
  const { onboardingComplete, isLoading: isOnboardingStatusLoading } =
    useOnboardingStatus(isAuthenticated);

  // Track if user has completed onboarding in this session (to avoid showing modal again)
  const [onboardingCompletedThisSession, setOnboardingCompletedThisSession] =
    useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/auth" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading state - minimal Apple-style spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-white/[0.08] border-t-white/40 animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
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
        {needsSetup && <E2EESetupModal />}

        {/* E2EE Unlock Modal - show when locked or unlocking */}
        {!needsSetup &&
          (e2eeStatus === "locked" || e2eeStatus === "unlocking") && (
            <E2EEUnlockModal />
          )}

        {/* Onboarding Completion Modal - show when unlocked but no unlock method set up */}
        {!needsSetup &&
          e2eeStatus === "unlocked" &&
          !isOnboardingStatusLoading &&
          !onboardingComplete &&
          !onboardingCompletedThisSession && (
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
