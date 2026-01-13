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
import { TRPCProvider } from './providers/TRPCProvider';
import { AuthProvider } from './providers/AuthProvider';
import { E2EEProvider } from './providers/E2EEProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { useRealtimeUpdates } from './hooks/useRealtimeUpdates';
import './styles/globals.css';

// Initialize i18n
import './i18n';

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
    <TRPCProvider>
      <AuthProvider>
        <ThemeProvider>
          <E2EEProvider>
            <RealtimeUpdatesInitializer>
              <RouterProvider router={router} />
              <Toaster position="top-right" richColors />
            </RealtimeUpdatesInitializer>
          </E2EEProvider>
        </ThemeProvider>
      </AuthProvider>
    </TRPCProvider>
  </StrictMode>
);
