import { useNavigate } from '@tanstack/react-router';
import { trpc } from '@/lib/trpc';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';

export function BillingTab() {
  const navigate = useNavigate();
  const { closeSettingsModal } = useUIStore();
  const { data: subData } = trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const currentPlan = subData?.plan;
  const subscription = subData?.subscription;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Billing</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold">{currentPlan?.name || 'Free'}</p>
          </div>
          {subscription?.status && (
            <span
              className={cn(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                subscription.status === 'active'
                  ? 'bg-green-500/10 text-green-600'
                  : subscription.status === 'on_hold'
                    ? 'bg-yellow-500/10 text-yellow-600'
                    : 'bg-secondary text-muted-foreground'
              )}
            >
              {subscription.status}
            </span>
          )}
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
      </div>

      {/* Manage Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          closeSettingsModal();
          navigate({ to: '/app/billing' });
        }}
      >
        Manage Billing
        <ExternalLink className="ml-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
