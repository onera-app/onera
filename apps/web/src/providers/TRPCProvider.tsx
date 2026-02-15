import { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useAuth } from "@/providers/SupabaseAuthProvider";
import { trpc } from "@/lib/trpc";

// In production, VITE_API_URL is "/api" and tRPC endpoint is "/api/trpc"
// In development, it's "http://localhost:3000" and tRPC endpoint is "http://localhost:3000/trpc"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Build the tRPC URL - handles both relative (/api) and absolute URLs
function getTrpcUrl(): string {
  // If API_URL is relative (starts with /), append /trpc
  if (API_URL.startsWith("/")) {
    return `${API_URL}/trpc`;
  }
  // Otherwise, it's an absolute URL, just append /trpc
  return `${API_URL}/trpc`;
}

/**
 * TRPC Provider that includes Supabase JWT in Authorization header
 * Must be used inside SupabaseAuthProvider
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Create tRPC client with JWT token injection
  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          httpBatchLink({
            url: getTrpcUrl(),
            async headers() {
              // Get JWT token from Supabase
              const token = await getToken();
              if (token) {
                return {
                  Authorization: `Bearer ${token}`,
                };
              }
              return {};
            },
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              });
            },
          }),
        ],
      }),
    [getToken]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
