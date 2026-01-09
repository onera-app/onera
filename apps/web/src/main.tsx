import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import { routeTree } from './routeTree.gen';
import { E2EEProvider } from './providers/E2EEProvider';
import { ThemeProvider } from './providers/ThemeProvider';
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

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <E2EEProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </E2EEProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
