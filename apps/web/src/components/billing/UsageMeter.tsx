import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  unit?: string;
}

export function UsageMeter({ label, used, limit, unit = "" }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80;
  const isDanger = !isUnlimited && percentage >= 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()}
          {isUnlimited
            ? ` ${unit} (Unlimited)`
            : ` / ${limit.toLocaleString()} ${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isDanger
                ? "bg-destructive"
                : isWarning
                  ? "bg-yellow-500"
                  : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
