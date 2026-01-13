import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
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

export function TRPCProvider({ children }: { children: React.ReactNode }) {
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

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: getTrpcUrl(),
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
