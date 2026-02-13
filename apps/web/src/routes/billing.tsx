import { trpc } from "@/lib/trpc";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { AlertTriangle, Check, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BillingPage() {
  const {
    data: subData,
    isLoading: loadingSubscription,
    error: subscriptionError,
  } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: loadingUsage, error: usageError } = trpc.billing.getUsage.useQuery();

  const currentPlan = subData?.plan;
  const isLoading = loadingSubscription || loadingUsage;
  const hasError = subscriptionError || usageError;

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
    <div
      className="h-full overflow-y-auto"
      style={{ background: "var(--chat-shell-bg)" }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-foreground">
            Billing
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your subscription and usage
          </p>
        </header>

        {hasError && (
          <Alert className="mb-8 border-destructive/40 bg-destructive/5" aria-live="assertive">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle>Couldn&apos;t load billing data</AlertTitle>
            <AlertDescription>
              Billing details are temporarily unavailable. Please refresh and try again.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !hasError && (
          <div className="mb-8 rounded-2xl bg-muted/50 p-6 animate-pulse">
            <div className="h-6 w-1/3 rounded bg-muted mb-4" />
            <div className="h-4 w-1/2 rounded bg-muted mb-2" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        )}

        {/* Current Plan Card */}
        <section className="mb-8">
          <div className="rounded-2xl chat-surface-elevated p-5 sm:p-6 border border-[var(--chat-divider)]">
            {/* Plan Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    currentPlan?.id === "privacy_max"
                      ? "bg-primary/15"
                      : currentPlan?.id === "pro"
                        ? "bg-primary/15"
                        : currentPlan?.id === "starter"
                          ? "bg-status-success/15"
                          : currentPlan?.id === "team"
                            ? "bg-status-warning/15"
                            : currentPlan?.id === "enterprise"
                              ? "bg-primary/15"
                              : "bg-muted",
                  )}
                >
                  <CreditCard
                    className={cn(
                      "w-5 h-5",
                      currentPlan?.id === "privacy_max"
                        ? "text-primary"
                        : currentPlan?.id === "pro"
                          ? "text-primary"
                          : currentPlan?.id === "starter"
                            ? "text-status-success-text"
                            : currentPlan?.id === "team"
                              ? "text-status-warning-text"
                              : currentPlan?.id === "enterprise"
                                ? "text-primary"
                                : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {currentPlan?.name || "Free"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan?.description ||
                      "Encrypted AI chat with all features"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-status-success/10 text-status-success-text">
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
          <h3 className="text-sm font-medium text-muted-foreground mb-4 px-1">
            What's included
          </h3>
          <div className="rounded-2xl chat-surface p-5 sm:p-6 border border-[var(--chat-divider)]">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-sm text-foreground/80"
                >
                  <div className="w-4 h-4 rounded-full bg-status-success/15 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-status-success-text" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground text-center mt-8 px-4">
          Paid plans coming soon. We'll give plenty of notice before any
          changes.
        </p>
      </div>
    </div>
  );
}
