import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  unit?: string;
  overageCount?: number; // number of overage requests (usage billing)
}

export function UsageMeter({
  label,
  used,
  limit,
  unit = "",
  overageCount = 0,
}: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const hasOverage = overageCount > 0 && !isUnlimited;
  const baseUsed = hasOverage ? used - overageCount : used;
  const percentage = isUnlimited ? 0 : Math.min((baseUsed / limit) * 100, 100);
  const overagePercentage = hasOverage
    ? Math.min((overageCount / limit) * 100, 20)
    : 0;
  const isWarning = !isUnlimited && percentage >= 80;
  const isDanger = !isUnlimited && (percentage >= 95 || hasOverage);

  return (
    <div className="space-y-2">
      {/* Label and Value */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-900 dark:text-gray-100">{label}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {isUnlimited ? (
            <>
              {used.toLocaleString()} {unit}
              <span className="text-gray-500 dark:text-gray-400 ml-1">(Unlimited)</span>
            </>
          ) : (
            <>
              {used.toLocaleString()}
              <span className="text-gray-500 dark:text-gray-400">
                {" "}
                / {limit.toLocaleString()} {unit}
              </span>
            </>
          )}
          {hasOverage && (
            <span className="text-status-warning-text ml-1.5">
              +{overageCount.toLocaleString()}
            </span>
          )}
        </span>
      </div>

      {/* Progress Bar - only for limited plans */}
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-850 overflow-hidden">
          <div className="flex h-full">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out",
                hasOverage ? "rounded-l-full" : "rounded-full",
                isDanger
                  ? "bg-red-500"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-primary/50",
              )}
              style={{ width: `${percentage}%` }}
            />
            {hasOverage && (
              <div
                className="h-full rounded-r-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${overagePercentage}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
