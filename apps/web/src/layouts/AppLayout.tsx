import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useConvexAuth } from 'convex/react';
import { useE2EEStore } from '@/stores/e2eeStore';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { ResizeHandle } from '@/components/layout/ResizeHandle';
import { E2EEUnlockModal } from '@/components/e2ee/E2EEUnlockModal';
import { E2EESetupModal } from '@/components/e2ee/E2EESetupModal';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { status: e2eeStatus, needsSetup } = useE2EEStore();
  const { sidebarOpen, toggleSidebar, chatDensity } = useUIStore();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/auth' });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center rotate-3">
              <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-14 w-14 border-2 border-transparent border-t-accent/30" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Cortex</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Loading...</p>
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
    <div
      className={cn(
        'flex h-screen bg-white dark:bg-gray-950',
        `chat-density-${chatDensity}`
      )}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Resize handle */}
      <ResizeHandle />

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Sidebar toggle when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className={cn(
              'absolute top-3.5 left-3.5 z-50',
              'p-2.5 rounded-xl',
              'bg-white dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-700/50',
              'shadow-soft',
              'text-gray-600 dark:text-gray-300',
              'hover:bg-gray-50 dark:hover:bg-gray-800',
              'transition-all duration-150'
            )}
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </button>
        )}
        <Outlet />
      </main>

      {/* E2EE Setup Modal */}
      {needsSetup && <E2EESetupModal />}

      {/* E2EE Unlock Modal */}
      {!needsSetup && e2eeStatus === 'locked' && <E2EEUnlockModal />}
    </div>
  );
}
