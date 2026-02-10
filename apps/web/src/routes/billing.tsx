import { trpc } from "@/lib/trpc";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { Check } from "lucide-react";

export function BillingPage() {
  const { data: subData } =
    trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();

  const currentPlan = subData?.plan;

  return (
    <div className="h-full overflow-y-auto">
    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and usage
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
                {currentPlan?.description || "Encrypted AI chat — all features included"}
              </p>
            </div>
            <span className="inline-flex rounded-full px-3 py-1 text-sm font-medium bg-green-500/10 text-green-600">
              Early Access
            </span>
          </div>

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
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">What's Included</h2>
        <div className="rounded-xl border border-border p-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Unlimited inference requests",
              "Unlimited BYOK inference",
              "Unlimited storage",
              "End-to-end encryption",
              "Voice input & calls",
              "Custom API endpoints",
              "Custom models",
              "Large models (70B+) in TEE",
              "Dedicated enclaves",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            Paid plans coming soon. We'll give plenty of notice before any changes.
          </p>
        </div>
      </section>
    </div>
    </div>
  );
}
