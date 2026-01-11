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
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 dark:border-gray-700 border-t-accent" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
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
            className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
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
