import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  unit?: string;
  overageCount?: number; // number of overage requests (usage billing)
}

export function UsageMeter({ label, used, limit, unit = "", overageCount = 0 }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const hasOverage = overageCount > 0 && !isUnlimited;
  const baseUsed = hasOverage ? used - overageCount : used;
  const percentage = isUnlimited ? 0 : Math.min((baseUsed / limit) * 100, 100);
  const overagePercentage = hasOverage ? Math.min((overageCount / limit) * 100, 20) : 0;
  const isWarning = !isUnlimited && percentage >= 80;
  const isDanger = !isUnlimited && (percentage >= 95 || hasOverage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()}
          {isUnlimited
            ? ` ${unit} (Unlimited)`
            : ` / ${limit.toLocaleString()} ${unit}`}
          {hasOverage && (
            <span className="text-orange-500 ml-1">
              (+{overageCount.toLocaleString()} overage)
            </span>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="flex h-full">
            <div
              className={cn(
                "h-full transition-all duration-500",
                hasOverage
                  ? "rounded-l-full"
                  : "rounded-full",
                isDanger
                  ? "bg-destructive"
                  : isWarning
                    ? "bg-yellow-500"
                    : "bg-primary"
              )}
              style={{ width: `${percentage}%` }}
            />
            {hasOverage && (
              <div
                className="h-full rounded-r-full bg-orange-500 transition-all duration-500"
                style={{ width: `${overagePercentage}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
