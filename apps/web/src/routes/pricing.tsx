import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { PlanCard } from "@/components/billing/PlanCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PricingPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const { data: plans, isLoading } = trpc.billing.getPlans.useQuery();
  const { data: currentSub } = trpc.billing.getSubscription.useQuery(
    undefined,
    { enabled: !!isSignedIn }
  );
  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectPlan = (planId: string) => {
    if (!isSignedIn) {
      navigate({ to: "/auth" });
      return;
    }
    if (planId === "free") return;
    createCheckout.mutate({ planId, billingInterval });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose the plan that fits your needs
          </p>

          {/* Billing interval toggle */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1 text-xs opacity-75">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              features={plan.features as Record<string, boolean>}
              limits={{
                inferenceRequests: plan.inferenceRequestsLimit,
                storageMb: plan.storageLimitMb,
                maxEnclaves: plan.maxEnclaves,
              }}
              isCurrentPlan={currentSub?.plan?.id === plan.id}
              isPopular={plan.id === "pro"}
              billingInterval={billingInterval}
              onSelect={() => handleSelectPlan(plan.id)}
              loading={createCheckout.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
