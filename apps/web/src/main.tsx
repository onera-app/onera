// Must be first import - sets up Buffer polyfill with isBuffer
import './polyfills';

import { scan } from 'react-scan';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { routeTree } from './routeTree.gen';

// Enable React Scan in development
if (import.meta.env.DEV) {
  scan({ enabled: true });
}
import { PostHogProvider } from '@posthog/react';
import { SupabaseAuthProvider } from './providers/SupabaseAuthProvider';
import { TRPCProvider } from './providers/TRPCProvider';
import { E2EEProvider } from './providers/E2EEProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { SearchProvider } from './components/providers/SearchProvider';
import { useRealtimeUpdates } from './hooks/useRealtimeUpdates';
import { AppErrorBoundary } from './components/system/AppErrorBoundary';
import './styles/globals.css';

// Initialize i18n
import './i18n';

// PostHog configuration
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY ?? '';
const posthogOptions = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  // Show PostHog debug logs in dev console
  debug: !!import.meta.env.DEV,
} as const;

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Component to initialize real-time updates
function RealtimeUpdatesInitializer({ children }: { children: React.ReactNode }) {
  useRealtimeUpdates();
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider apiKey={posthogKey} options={posthogOptions}>
      <AppErrorBoundary>
        <SupabaseAuthProvider>
          <TRPCProvider>
            <ThemeProvider>
              <E2EEProvider>
                <SearchProvider>
                  <RealtimeUpdatesInitializer>
                    <RouterProvider router={router} />
                    <Toaster position="top-right" richColors />
                  </RealtimeUpdatesInitializer>
                </SearchProvider>
              </E2EEProvider>
            </ThemeProvider>
          </TRPCProvider>
        </SupabaseAuthProvider>
      </AppErrorBoundary>
    </PostHogProvider>
  </StrictMode>
);
