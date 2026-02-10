import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/PlanCard";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreditCard, ExternalLink, Zap } from "lucide-react";

export function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDisableUsageDialog, setShowDisableUsageDialog] = useState(false);

  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: subData, refetch: refetchSub } =
    trpc.billing.getSubscription.useQuery();
  const { data: usage, refetch: refetchUsage } = trpc.billing.getUsage.useQuery();
  const { data: invoicesData } = trpc.billing.getInvoices.useQuery({
    limit: 10,
  });
  const { data: portalData } = trpc.billing.getPortalUrl.useQuery();

  const changePlan = trpc.billing.changePlan.useMutation({
    onSuccess: (data) => {
      if (data.pendingDowngrade) {
        toast.success("Downgrade scheduled for end of billing period");
      } else {
        toast.success("Plan upgraded successfully");
      }
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelPendingDowngrade = trpc.billing.cancelPendingDowngrade.useMutation({
    onSuccess: () => {
      toast.success("Pending downgrade cancelled");
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setShowCancelDialog(false);
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error) => toast.error(error.message),
  });

  const enableUsageBilling = trpc.billing.enableUsageBilling.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error) => toast.error(error.message),
  });

  const disableUsageBilling = trpc.billing.disableUsageBilling.useMutation({
    onSuccess: () => {
      toast.success("Usage-based billing disabled");
      setShowDisableUsageDialog(false);
      refetchSub();
      refetchUsage();
    },
    onError: (error) => toast.error(error.message),
  });

  const currentPlan = subData?.plan;
  const subscription = subData?.subscription;
  const pendingPlan = subData?.pendingPlan;
  const hasActiveSubscription =
    subscription && (subscription.status === "active" || subscription.status === "trialing");
  const hasDodoSubscription = hasActiveSubscription && !!subscription.dodoSubscriptionId;

  const handlePlanAction = (planId: string) => {
    if (planId === "free") return;

    if (hasDodoSubscription) {
      changePlan.mutate({ planId, billingInterval });
    } else {
      createCheckout.mutate({ planId, billingInterval });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan & Usage */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Current Plan</h2>
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">
                {currentPlan?.name || "Free"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentPlan?.description || "Basic features"}
              </p>
            </div>
            {subscription?.status && (
              <div className="flex flex-col items-end gap-1">
                <span
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                    subscription.status === "active"
                      ? "bg-green-500/10 text-green-600"
                      : subscription.status === "on_hold"
                        ? "bg-yellow-500/10 text-yellow-600"
                        : subscription.status === "cancelled" ||
                            subscription.status === "expired"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-secondary text-muted-foreground"
                  )}
                >
                  {subscription.status}
                </span>
                {subscription.currentPeriodEnd && (
                  <span className="text-xs text-muted-foreground">
                    {subscription.status === "cancelled" ? "Access until" : "Renews"}{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {usage && currentPlan && (
            <div className="space-y-4">
              <UsageMeter
                label="Private Inference"
                used={usage.inferenceRequests}
                limit={currentPlan.inferenceRequestsLimit}
                unit="requests"
                overageCount={usage.overageCount}
              />
              <UsageMeter
                label="BYOK Inference"
                used={usage.byokInferenceRequests}
                limit={currentPlan.byokInferenceRequestsLimit}
                unit="requests"
              />
              <UsageMeter
                label="Storage"
                used={Math.round(usage.storageMb / 100) / 10}
                limit={currentPlan.storageLimitMb === -1 ? -1 : Math.round(currentPlan.storageLimitMb / 100) / 10}
                unit="GB"
              />
              {usage.periodStart && usage.periodEnd && (
                <p className="text-xs text-muted-foreground pt-1">
                  Billing period: {new Date(usage.periodStart).toLocaleDateString()} — {new Date(usage.periodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Pending Downgrade Notice */}
          {pendingPlan && subscription?.currentPeriodEnd && (
            <div className="flex items-center justify-between rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <p className="text-sm text-yellow-600">
                Downgrading to <span className="font-medium">{pendingPlan.name}</span> on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelPendingDowngrade.mutate()}
                disabled={cancelPendingDowngrade.isPending}
                className="text-yellow-600 hover:text-yellow-700"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            {portalData?.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={portalData.url} target="_blank" rel="noopener">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payment Methods
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
            {hasDodoSubscription && currentPlan?.id !== "free" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Usage-Based Billing */}
      {hasActiveSubscription && currentPlan && currentPlan.inferenceRequestsLimit !== -1 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Usage-Based Billing</h2>
          <div className="rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <h3 className="font-medium">Overage Billing</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {usage?.usageBasedBilling
                    ? "When you exceed your plan's private inference limit, requests continue and overage usage is billed per-request."
                    : "Enable to continue using private inference after reaching your plan limit. Overage requests are billed per-request."}
                </p>
              </div>
              {usage?.usageBasedBilling ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisableUsageDialog(true)}
                  disabled={disableUsageBilling.isPending}
                  className="shrink-0"
                >
                  Disable
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => enableUsageBilling.mutate()}
                  disabled={enableUsageBilling.isPending}
                  className="shrink-0"
                >
                  {enableUsageBilling.isPending ? "Redirecting..." : "Enable"}
                </Button>
              )}
            </div>
            {usage?.usageBasedBilling && usage.overageCount > 0 && (
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                <p className="text-sm text-orange-600">
                  <span className="font-medium">{usage.overageCount.toLocaleString()}</span> overage{" "}
                  {usage.overageCount === 1 ? "request" : "requests"} this billing period
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Change Plan */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Change Plan</h2>
          <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
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
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                billingInterval === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              isCurrentPlan={currentPlan?.id === plan.id}
              isPopular={plan.id === "pro"}
              billingInterval={billingInterval}
              onSelect={() => handlePlanAction(plan.id)}
              loading={changePlan.isPending || createCheckout.isPending}
            />
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice History</h2>
        <div className="rounded-xl border border-border p-6">
          <InvoiceTable invoices={invoicesData || []} />
        </div>
      </section>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
          <AlertDialogDescription>
            Your subscription will remain active until the end of the current
            billing period. After that, you'll be downgraded to the Free plan.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelSubscription.mutate()}
              disabled={cancelSubscription.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSubscription.isPending
                ? "Cancelling..."
                : "Cancel Subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Usage Billing Confirmation Dialog */}
      <AlertDialog open={showDisableUsageDialog} onOpenChange={setShowDisableUsageDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Disable Usage-Based Billing?</AlertDialogTitle>
          <AlertDialogDescription>
            Once disabled, private inference requests will be blocked when you
            reach your plan limit instead of continuing as overage.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Enabled</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableUsageBilling.mutate()}
              disabled={disableUsageBilling.isPending}
            >
              {disableUsageBilling.isPending
                ? "Disabling..."
                : "Disable Usage Billing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
}
