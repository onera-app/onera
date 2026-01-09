import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useE2EEStore } from '@/stores/e2eeStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { E2EEUnlockModal } from '@/components/e2ee/E2EEUnlockModal';
import { E2EESetupModal } from '@/components/e2ee/E2EESetupModal';

export function AppLayout() {
  const navigate = useNavigate();
  const { user, token, isLoading } = useAuthStore();
  const { status: e2eeStatus, needsSetup } = useE2EEStore();

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
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* E2EE Setup Modal */}
      {needsSetup && <E2EESetupModal />}

      {/* E2EE Unlock Modal */}
      {!needsSetup && e2eeStatus === 'locked' && <E2EEUnlockModal />}
    </div>
  );
}
