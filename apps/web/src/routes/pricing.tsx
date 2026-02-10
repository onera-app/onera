import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { PlanCard } from "@/components/billing/PlanCard";
import { Button } from "@/components/ui/button";
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
      <div className="mx-auto max-w-7xl">
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
              <span className="ml-1 text-xs opacity-75">Save up to 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {plans
            ?.filter((plan) => plan.id !== "team")
            .map((plan) => (
              <PlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                monthlyPrice={plan.monthlyPrice}
                yearlyPrice={plan.yearlyPrice}
                features={plan.features as Record<string, boolean>}
                limits={{
                  inferenceRequests: plan.inferenceRequestsLimit,
                  byokInferenceRequests: plan.byokInferenceRequestsLimit ?? undefined,
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

        {/* Team plan callout */}
        {plans?.find((p) => p.id === "team") && (
          <div className="mt-10 rounded-2xl border border-border p-6 sm:p-8 text-center max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold">Team</h3>
            <p className="mt-2 text-muted-foreground">
              Encrypted AI for your organization. SSO, admin controls, pooled usage.
            </p>
            <p className="mt-3">
              <span className="text-3xl font-bold">
                {billingInterval === "yearly" ? "$33" : "$35"}
              </span>
              <span className="text-muted-foreground">/user/mo</span>
              {billingInterval === "yearly" && (
                <span className="ml-2 text-sm text-muted-foreground">
                  billed yearly
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Minimum 5 seats
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                window.location.href = "mailto:team@onera.chat?subject=Team Plan Inquiry";
              }}
            >
              Contact Us
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
