import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

export function useEntitlements() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.billing.getEntitlements.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000, // Cache for 1 minute
  });

  return {
    entitlements: data,
    isLoading,
    hasFeature: (feature: string) => data?.features?.[feature] ?? false,
    isPaidPlan: data?.planId !== "free",
  };
}
