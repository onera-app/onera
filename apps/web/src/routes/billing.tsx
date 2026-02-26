import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, CreditCardIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { trpc } from "@/lib/trpc";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";

export function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const utils = trpc.useUtils();
  const {
    data: subData,
    isLoading: loadingSubscription,
    error: subscriptionError,
  } = trpc.billing.getSubscription.useQuery();
  const { data: plans = [], isLoading: loadingPlans } =
    trpc.billing.getPlans.useQuery();
  const { data: usage, isLoading: loadingUsage, error: usageError } = trpc.billing.getUsage.useQuery();
  const createCheckout = trpc.billing.createCheckout.useMutation();
  const changePlan = trpc.billing.changePlan.useMutation();

  const currentPlan = subData?.plan;
  const currentSubscription = subData?.subscription;
  const freePlan = plans.find((plan) => plan.id === "free");
  const resolvedCurrentPlan =
    (currentPlan ? plans.find((plan) => plan.id === currentPlan.id) : null) ??
    currentPlan ??
    freePlan ??
    null;
  const isLoading = loadingSubscription || loadingUsage;
  const hasError = subscriptionError || usageError;
  const isProcessing = createCheckout.isPending || changePlan.isPending;
  const currentPeriodEndDate = currentSubscription?.currentPeriodEnd
    ? new Date(currentSubscription.currentPeriodEnd)
    : null;
  const formatDate = (date: Date): string =>
    date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const CONTACT_US_URL = "https://github.com/onera-app/onera";
  const featureBenefitLabels: Record<string, string> = {
    prioritySupport: "Priority support",
    priorityQueue: "Priority inference queue",
  };
  const includedFeatures = resolvedCurrentPlan
    ? [
        resolvedCurrentPlan.inferenceRequestsLimit === -1
          ? "Unlimited private requests"
          : `${resolvedCurrentPlan.inferenceRequestsLimit.toLocaleString()} private requests/mo`,
        resolvedCurrentPlan.byokInferenceRequestsLimit === -1
          ? "Unlimited BYOK requests"
          : `${resolvedCurrentPlan.byokInferenceRequestsLimit.toLocaleString()} BYOK requests/mo`,
        resolvedCurrentPlan.storageLimitMb === -1
          ? "Unlimited storage"
          : resolvedCurrentPlan.storageLimitMb >= 1000
            ? `${(resolvedCurrentPlan.storageLimitMb / 1000).toFixed(
                resolvedCurrentPlan.storageLimitMb % 1000 === 0 ? 0 : 1,
              )} GB storage`
            : `${resolvedCurrentPlan.storageLimitMb} MB storage`,
        "End-to-end encryption",
        ...Object.entries(resolvedCurrentPlan.features ?? {})
          .filter(([key, enabled]) => Boolean(enabled) && featureBenefitLabels[key])
          .map(([key]) => featureBenefitLabels[key]),
      ]
    : ["End-to-end encryption"];

  const handleSelectPlan = async (planId: string): Promise<void> => {
    if (planId === "team") {
      window.open(CONTACT_US_URL, "_blank", "noopener,noreferrer");
      return;
    }

    const activePlanId = resolvedCurrentPlan?.id ?? "free";
    if (planId === activePlanId) return;

    analytics.billing.checkoutInitiated({ plan_id: planId });

    try {
      if (currentSubscription?.dodoSubscriptionId) {
        const result = await changePlan.mutateAsync({ planId, billingInterval });
        if (result.pendingDowngrade) {
          toast.success("Downgrade scheduled for next billing period");
        } else {
          toast.success("Plan change requested");
        }
        await utils.billing.getSubscription.invalidate();
        await utils.billing.getUsage.invalidate();
        return;
      }

      if (planId === "free") {
        return;
      }

      const checkout = await createCheckout.mutateAsync({ planId, billingInterval });
      if (!checkout.url) {
        throw new Error("Checkout URL not returned");
      }
      window.location.href = checkout.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update plan";
      toast.error(message);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto bg-white dark:bg-gray-900"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-gray-900 dark:text-gray-100">
            Billing
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Manage your subscription and usage
          </p>
        </header>

        {hasError && (
          <Alert className="mb-8 border-destructive/40 bg-destructive/5" aria-live="assertive">
            <HugeiconsIcon icon={Alert01Icon} className="h-4 w-4 text-destructive" />
            <AlertTitle>Couldn&apos;t load billing data</AlertTitle>
            <AlertDescription>
              Billing details are temporarily unavailable. Please refresh and try again.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !hasError && (
          <div className="mb-8 rounded-2xl bg-gray-50 dark:bg-gray-850 p-6 animate-pulse">
            <div className="h-6 w-1/3 rounded bg-gray-100 dark:bg-gray-850 mb-4" />
            <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-850 mb-2" />
            <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-850" />
          </div>
        )}

        {/* Current Plan Card */}
        <section className="mb-8">
          <div className="rounded-2xl bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-850 p-5 sm:p-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    currentPlan?.id === "pro"
                      ? "bg-primary/15"
                      : currentPlan?.id === "team"
                        ? "bg-primary/15"
                      : currentPlan?.id === "starter"
                          ? "bg-status-success/15"
                          : currentPlan?.id === "team"
                            ? "bg-status-warning/15"
                            : currentPlan?.id === "enterprise"
                              ? "bg-primary/15"
                              : "bg-gray-100 dark:bg-gray-850",
                  )}
                >
                  <HugeiconsIcon icon={CreditCardIcon} className={cn(
                                                        "w-5 h-5",
                                                        currentPlan?.id === "pro"
                                                          ? "text-primary"
                                                          : currentPlan?.id === "team"
                                                            ? "text-primary"
                                                          : currentPlan?.id === "starter"
                                                              ? "text-status-success-text"
                                                              : currentPlan?.id === "team"
                                                                ? "text-status-warning-text"
                                                                : currentPlan?.id === "enterprise"
                                                                  ? "text-primary"
                                                                  : "text-gray-500 dark:text-gray-400",
                                                      )} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {resolvedCurrentPlan?.name || "Free"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {resolvedCurrentPlan?.description ||
                      "Encrypted AI chat to get started"}
                  </p>
                  {currentPeriodEndDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Current period ends {formatDate(currentPeriodEndDate)}
                    </p>
                  )}
                </div>
              </div>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary">
                Current plan
              </span>
            </div>

            {/* Usage Meters */}
            {usage && resolvedCurrentPlan && (
              <div className="space-y-4">
                <UsageMeter
                  label="Private Inference"
                  used={usage.inferenceRequests}
                  limit={resolvedCurrentPlan.inferenceRequestsLimit}
                  unit="requests"
                />
                <UsageMeter
                  label="BYOK Inference"
                  used={usage.byokInferenceRequests}
                  limit={resolvedCurrentPlan.byokInferenceRequestsLimit}
                  unit="requests"
                />
                <UsageMeter
                  label="Storage"
                  used={usage.storageMb}
                  limit={resolvedCurrentPlan.storageLimitMb}
                  unit="MB"
                />
              </div>
            )}
          </div>
        </section>

        {/* What's Included */}
        <section>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 px-1">
            What's included
          </h3>
          <div className="rounded-2xl bg-gray-50 dark:bg-gray-850/50 border border-gray-100 dark:border-gray-850 p-5 sm:p-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
              {includedFeatures.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-sm text-gray-900/80 dark:text-gray-100/80"
                >
                  <div className="w-4 h-4 rounded-full bg-status-success/15 flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={Tick01Icon} className="w-2.5 h-2.5 text-status-success-text" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Plan Selection */}
        <section className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 px-1">
              Change plan
            </h3>
            <div className="inline-flex rounded-xl border border-gray-100 dark:border-gray-850 p-1 bg-gray-50 dark:bg-gray-850/50">
              <button
                type="button"
                onClick={() => {
                  analytics.billing.intervalToggled({ interval: "monthly" });
                  setBillingInterval("monthly");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors",
                  billingInterval === "monthly"
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => {
                  analytics.billing.intervalToggled({ interval: "yearly" });
                  setBillingInterval("yearly");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-colors",
                  billingInterval === "yearly"
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                )}
              >
                Yearly
              </button>
            </div>
          </div>

          {currentSubscription?.pendingPlanId && (
            <Alert className="mb-4 border-primary/30 bg-primary/5">
              <AlertTitle>Pending downgrade</AlertTitle>
              <AlertDescription>
                Your plan will change to <span className="font-medium">{subData?.pendingPlan?.name || currentSubscription.pendingPlanId}</span>{" "}
                {currentPeriodEndDate
                  ? `on ${formatDate(currentPeriodEndDate)}.`
                  : "at the next billing cycle."}
              </AlertDescription>
            </Alert>
          )}

          {loadingPlans ? (
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-850 p-6 animate-pulse">
              <div className="h-5 w-32 rounded bg-gray-100 dark:bg-gray-850 mb-4" />
              <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-850 mb-2" />
              <div className="h-4 w-4/5 rounded bg-gray-100 dark:bg-gray-850" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const isCurrent = (resolvedCurrentPlan?.id ?? "free") === plan.id;
                const currentTier = resolvedCurrentPlan?.tier ?? 0;
                const isDowngrade = plan.tier < currentTier;
                const extraBenefits = Object.entries(plan.features ?? {})
                  .filter(([key, enabled]) => Boolean(enabled) && featureBenefitLabels[key])
                  .map(([key]) => featureBenefitLabels[key]);
                const planBenefits = [
                  plan.inferenceRequestsLimit === -1
                    ? "Unlimited private requests"
                    : `${plan.inferenceRequestsLimit.toLocaleString()} private requests/mo`,
                  plan.byokInferenceRequestsLimit === -1
                    ? "Unlimited BYOK requests"
                    : `${plan.byokInferenceRequestsLimit.toLocaleString()} BYOK requests/mo`,
                  plan.storageLimitMb === -1
                    ? "Unlimited storage"
                    : plan.storageLimitMb >= 1000
                      ? `${(plan.storageLimitMb / 1000).toFixed(plan.storageLimitMb % 1000 === 0 ? 0 : 1)} GB storage`
                      : `${plan.storageLimitMb} MB storage`,
                  ...extraBenefits,
                ];
                const monthlyEquivalent =
                  billingInterval === "yearly"
                    ? Math.round(plan.yearlyPrice / 12)
                    : plan.monthlyPrice;
                const actionLabel =
                  isCurrent
                    ? "Current Plan"
                    : plan.id === "team"
                      ? "Contact us"
                      : plan.id === "free"
                        ? "Downgrade to Free"
                        : "Select Plan";

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "rounded-2xl border p-5 sm:p-6 flex flex-col gap-4",
                      isCurrent
                        ? "bg-white dark:bg-gray-850 border-primary/40"
                        : "bg-gray-50 dark:bg-gray-850/50 border-gray-100 dark:border-gray-850",
                    )}
                  >
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.description}</p>
                    </div>

                    <div>
                      <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                        ${Math.round(monthlyEquivalent / 100)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">/mo</span>
                      {billingInterval === "yearly" && plan.yearlyPrice > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ${Math.round(plan.yearlyPrice / 100)} billed yearly
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {planBenefits.map((benefit) => (
                        <li
                          key={`${plan.id}-${benefit}`}
                          className="flex items-center gap-2 text-sm text-gray-900/85 dark:text-gray-100/85"
                        >
                          <HugeiconsIcon icon={Tick01Icon} className="w-3.5 h-3.5 text-status-success-text flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full mt-auto"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || isProcessing}
                      onClick={() => void handleSelectPlan(plan.id)}
                    >
                      {actionLabel}
                    </Button>
                    {!isCurrent && plan.id !== "team" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {isDowngrade
                          ? currentPeriodEndDate
                            ? `Takes effect on ${formatDate(currentPeriodEndDate)}`
                            : "Takes effect next billing cycle"
                          : "Takes effect immediately"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
