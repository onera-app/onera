import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useE2EEStore } from '@/stores/e2eeStore';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { E2EEUnlockModal } from '@/components/e2ee/E2EEUnlockModal';
import { E2EESetupModal } from '@/components/e2ee/E2EESetupModal';
import { SettingsModal } from '@/features/settings-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PanelLeft, Sparkles } from 'lucide-react';

export function AppLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { status: e2eeStatus, needsSetup } = useE2EEStore();
  const { sidebarOpen, toggleSidebar, chatDensity, settingsModalOpen, settingsModalTab, closeSettingsModal } = useUIStore();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/auth' });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center rotate-3">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-14 w-14 border-2 border-transparent border-t-primary/30" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <Skeleton className="h-4 w-16 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        </div>
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
          'flex h-screen bg-background relative overflow-hidden',
          `chat-density-${chatDensity}`
        )}
      >
        {/* Ambient Background Effects */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[100px]" />
          <div className="absolute -bottom-[20%] left-[20%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[100px]" />
        </div>
        {/* Sidebar */}
        <Sidebar />

        {/* Resize handle */}
        <ResizeHandle />

        {/* Main content */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {/* Sidebar toggle when collapsed */}
          {!sidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="absolute top-3 left-3 z-50 h-9 w-9"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <Outlet />
        </main>

        {/* E2EE Setup Modal */}
        {needsSetup && <E2EESetupModal />}

        {/* E2EE Unlock Modal - show when locked or unlocking */}
        {!needsSetup && (e2eeStatus === 'locked' || e2eeStatus === 'unlocking') && <E2EEUnlockModal />}

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
