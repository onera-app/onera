import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Try encrypted AI chat",
    monthlyPrice: 0,
    yearlyPrice: 0,
    storage: "100 MB",
    highlights: [
      "25 private requests/mo",
      "100 BYOK requests/mo",
      "Encrypted chat & notes",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Private AI for everyday use",
    monthlyPrice: 1200,
    yearlyPrice: 12000,
    storage: "2 GB",
    highlights: [
      "500 private requests/mo",
      "2,000 BYOK requests/mo",
      "Voice input",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Serious privacy for serious work",
    monthlyPrice: 2900,
    yearlyPrice: 27600,
    storage: "20 GB",
    highlights: [
      "5,000 private requests/mo",
      "Unlimited BYOK",
      "Custom API endpoints",
    ],
  },
  {
    id: "privacy_max",
    name: "Privacy Max",
    description: "Maximum privacy, zero compromise",
    monthlyPrice: 4900,
    yearlyPrice: 46800,
    storage: "100 GB",
    highlights: [
      "Unlimited requests",
      "Dedicated enclaves",
      "Priority support & queue",
    ],
  },
];

export function PricingSection() {
  const { isAuthenticated } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-md mx-auto">
            Choose the plan that fits your needs. No hidden fees.
          </p>

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
              <span className="ml-1 text-xs opacity-75">Save up to 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.id === "pro";
            const monthlyEquivalent =
              billingInterval === "yearly"
                ? Math.round(plan.yearlyPrice / 12)
                : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-5 sm:p-6",
                  isPopular
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {plan.description}
                </p>

                <div className="mt-4 mb-4">
                  <span className="text-3xl font-bold">
                    {formatPrice(monthlyEquivalent)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>

                <div className="text-xs text-muted-foreground mb-4">
                  {plan.storage} storage
                </div>

                <ul className="flex-1 space-y-2 mb-5">
                  {plan.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    window.location.href = isAuthenticated
                      ? "/pricing"
                      : "/auth";
                  }}
                  className={cn(
                    "w-full rounded-lg py-2 text-sm font-medium transition-colors",
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-accent"
                  )}
                >
                  {plan.monthlyPrice === 0 ? "Get Started" : "Select Plan"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 px-4">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-neutral-200/60 dark:border-neutral-700/60 text-xs sm:text-sm shadow-sm text-center">
            <span className="size-2 rounded-full bg-violet-500 flex-shrink-0" />
            <span>
              Your conversations stay private with end-to-end encryption
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
