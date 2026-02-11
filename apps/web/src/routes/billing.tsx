import { trpc } from "@/lib/trpc";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { Check, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export function BillingPage() {
  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const currentPlan = subData?.plan;

  const features = [
    "Unlimited inference requests",
    "Unlimited BYOK inference",
    "Unlimited storage",
    "End-to-end encryption",
    "Voice input & calls",
    "Custom API endpoints",
    "Custom models",
    "Large models (70B+) in TEE",
    "Dedicated enclaves",
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-10">
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em] text-foreground">
            Billing
          </h1>
          <p className="text-[14px] sm:text-[15px] text-muted-foreground mt-1">
            Manage your subscription and usage
          </p>
        </header>

        {/* Current Plan Card */}
        <section className="mb-8">
          <div className="rounded-2xl bg-muted/50 p-5 sm:p-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    currentPlan?.id === "privacy_max"
                      ? "bg-purple-500/15"
                      : currentPlan?.id === "pro"
                        ? "bg-blue-500/15"
                        : currentPlan?.id === "starter"
                          ? "bg-emerald-500/15"
                          : currentPlan?.id === "team"
                            ? "bg-amber-500/15"
                            : currentPlan?.id === "enterprise"
                              ? "bg-purple-500/15"
                              : "bg-muted",
                  )}
                >
                  <CreditCard
                    className={cn(
                      "w-5 h-5",
                      currentPlan?.id === "privacy_max"
                        ? "text-purple-500"
                        : currentPlan?.id === "pro"
                          ? "text-blue-500"
                          : currentPlan?.id === "starter"
                            ? "text-emerald-500"
                            : currentPlan?.id === "team"
                              ? "text-amber-500"
                              : currentPlan?.id === "enterprise"
                                ? "text-purple-500"
                                : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-[17px] font-semibold text-foreground">
                    {currentPlan?.name || "Free"}
                  </h2>
                  <p className="text-[13px] text-muted-foreground">
                    {currentPlan?.description ||
                      "Encrypted AI chat with all features"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
                Early Access
              </span>
            </div>

            {/* Usage Meters */}
            {usage && currentPlan && (
              <div className="space-y-4">
                <UsageMeter
                  label="Private Inference"
                  used={usage.inferenceRequests}
                  limit={currentPlan.inferenceRequestsLimit}
                  unit="requests"
                />
                <UsageMeter
                  label="BYOK Inference"
                  used={usage.byokInferenceRequests}
                  limit={currentPlan.byokInferenceRequestsLimit}
                  unit="requests"
                />
                <UsageMeter
                  label="Storage"
                  used={usage.storageMb}
                  limit={currentPlan.storageLimitMb}
                  unit="MB"
                />
              </div>
            )}
          </div>
        </section>

        {/* What's Included */}
        <section>
          <h3 className="text-[13px] font-medium text-muted-foreground mb-4 px-1">
            What's included
          </h3>
          <div className="rounded-2xl bg-muted/50 p-5 sm:p-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-[14px] text-foreground/80"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer Note */}
        <p className="text-[12px] text-muted-foreground text-center mt-8 px-4">
          Paid plans coming soon. We'll give plenty of notice before any
          changes.
        </p>
      </div>
    </div>
  );
}
