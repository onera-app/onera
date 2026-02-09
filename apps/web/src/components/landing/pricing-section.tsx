import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PlanCard } from "@/components/billing/PlanCard";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const { isAuthenticated } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const { data: plans, isLoading } = trpc.billing.getPlans.useQuery();

  return (
    <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-10 sm:mb-16 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Choose the plan that fits your needs. No hidden fees.
          </p>

          {/* Billing interval toggle */}
          <div className="mt-6 sm:mt-8 inline-flex items-center gap-2 rounded-full border border-neutral-200/60 dark:border-neutral-700/60 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "monthly"
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
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
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-black"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1 text-xs opacity-75">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-96 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800/50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
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
                isPopular={plan.id === "pro"}
                billingInterval={billingInterval}
                onSelect={() => {
                  if (!isAuthenticated) {
                    window.location.href = "/auth";
                  } else {
                    window.location.href = "/pricing";
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 px-4">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm shadow-sm text-center">
            <span className="size-2 rounded-full bg-violet-500 flex-shrink-0" />
            <span>Your conversations stay private with end-to-end encryption</span>
          </div>
        </div>
      </div>
    </section>
  );
}
