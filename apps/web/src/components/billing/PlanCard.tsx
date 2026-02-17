import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  description: string;
  monthlyPrice: number; // cents
  yearlyPrice: number; // cents
  features: Record<string, boolean>;
  limits: {
    inferenceRequests: number;
    byokInferenceRequests?: number;
    storageMb: number;
    maxEnclaves: number;
  };
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  billingInterval: "monthly" | "yearly";
  onSelect: () => void;
  loading?: boolean;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatLimit(value: number, unit: string, unlimitedLabel?: string): string {
  if (value === -1) return unlimitedLabel ?? `Unlimited ${unit}`;
  return `${value.toLocaleString()} ${unit}`;
}

function formatStorage(mb: number): string {
  if (mb === -1) return "Unlimited storage";
  if (mb >= 1000) return `${(mb / 1000).toFixed(mb % 1000 === 0 ? 0 : 1)} GB storage`;
  return `${mb} MB storage`;
}

const featureLabels: Record<string, string> = {
  prioritySupport: "Priority support",
  priorityQueue: "Priority inference queue",
};

// Features included in all plans — not shown as differentiators
const universalFeatures = new Set(["largeModels"]);
const removedFeatureKeys = new Set([
  "customEndpoints",
  "largeModels",
  "dedicatedEnclaves",
]);

export function PlanCard({
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  features,
  limits,
  isCurrentPlan,
  isPopular,
  billingInterval,
  onSelect,
  loading,
}: PlanCardProps) {
  const monthlyEquivalent =
    billingInterval === "yearly" ? Math.round(yearlyPrice / 12) : monthlyPrice;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 sm:p-8",
        isPopular
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850",
        isCurrentPlan && "ring-2 ring-primary"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">
          {formatPrice(monthlyEquivalent)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">/mo</span>
        {billingInterval === "yearly" && monthlyPrice > 0 && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatPrice(yearlyPrice)} billed yearly
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatLimit(limits.inferenceRequests, "private requests/mo", "Unlimited private requests")}
        </li>
        {limits.byokInferenceRequests != null && (
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {formatLimit(limits.byokInferenceRequests, "BYOK requests/mo", "Unlimited BYOK requests")}
          </li>
        )}
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatStorage(limits.storageMb)}
        </li>
        {Object.entries(features).map(([key, enabled]) =>
          enabled && !universalFeatures.has(key) && !removedFeatureKeys.has(key) ? (
            <li key={key} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              {featureLabels[key] || key}
            </li>
          ) : null
        )}
      </ul>

      <Button
        onClick={onSelect}
        disabled={isCurrentPlan || loading}
        variant={isPopular ? "default" : "outline"}
        className="w-full"
      >
        {isCurrentPlan
          ? "Current Plan"
          : monthlyPrice === 0
            ? "Get Started"
            : "Select Plan"}
      </Button>
    </div>
  );
}
