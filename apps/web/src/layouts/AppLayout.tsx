import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useE2EEStore } from '@/stores/e2eeStore';
import { useUIStore } from '@/stores/uiStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { E2EEUnlockModal } from '@/components/e2ee/E2EEUnlockModal';
import { E2EESetupModal } from '@/components/e2ee/E2EESetupModal';

export function AppLayout() {
  const navigate = useNavigate();
  const { token, isLoading } = useAuthStore();
  const { status: e2eeStatus, needsSetup } = useE2EEStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !token) {
      navigate({ to: '/auth' });
    }
  }, [isLoading, token, navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  // Not authenticated
  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Sidebar toggle when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-3 left-3 z-50 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            title="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
