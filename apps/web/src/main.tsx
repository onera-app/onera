import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { routeTree } from './routeTree.gen';
import { E2EEProvider } from './providers/E2EEProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import './styles/globals.css';

// Initialize i18n
import './i18n';

// Create Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <ThemeProvider>
        <E2EEProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </E2EEProvider>
      </ThemeProvider>
    </ConvexAuthProvider>
  </StrictMode>
);
