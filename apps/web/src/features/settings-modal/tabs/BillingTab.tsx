import { trpc } from '@/lib/trpc';
import { UsageMeter } from '@/components/billing/UsageMeter';

export function BillingTab() {
  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const currentPlan = subData?.plan;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Billing</h3>
        <p className="text-sm text-muted-foreground">
          Your plan and usage
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold">{currentPlan?.name || 'Free'}</p>
          </div>
          <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/10 text-green-600">
            Early Access
          </span>
        </div>

        {/* Usage */}
        {usage && currentPlan && (
          <div className="space-y-3 pt-2 border-t border-border">
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
              used={Math.round(usage.storageMb / 100) / 10}
              limit={currentPlan.storageLimitMb === -1 ? -1 : Math.round(currentPlan.storageLimitMb / 100) / 10}
              unit="GB"
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          All features are unlimited during early access. Paid plans coming soon.
        </p>
      </div>
    </div>
  );
}
