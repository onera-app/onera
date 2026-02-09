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

function formatLimit(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  return `${value.toLocaleString()} ${unit}`;
}

const featureLabels: Record<string, string> = {
  voiceCalls: "Voice calls",
  prioritySupport: "Priority support",
  dedicatedEnclaves: "Dedicated enclaves",
  customModels: "Custom models",
};

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
          : "border-border bg-card",
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
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">
          {formatPrice(monthlyEquivalent)}
        </span>
        <span className="text-muted-foreground">/mo</span>
        {billingInterval === "yearly" && monthlyPrice > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPrice(yearlyPrice)} billed yearly
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatLimit(limits.inferenceRequests, "inference requests/mo")}
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatLimit(limits.storageMb, "MB storage")}
        </li>
        {limits.maxEnclaves !== 0 && (
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {formatLimit(limits.maxEnclaves, "dedicated enclaves")}
          </li>
        )}
        {Object.entries(features).map(([key, enabled]) =>
          enabled ? (
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
            : "Upgrade"}
      </Button>
    </div>
  );
}
