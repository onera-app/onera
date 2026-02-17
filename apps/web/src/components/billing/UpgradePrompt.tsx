import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  requiredPlan?: string;
}

export function UpgradePrompt({ feature, description, requiredPlan }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850 p-6 text-center">
      <Lock className="h-8 w-8 text-muted-foreground" />
      <h3 className="font-semibold">{feature}</h3>
      <p className="text-sm text-muted-foreground">
        {description || `This feature requires ${requiredPlan || "an upgraded plan"}.`}
      </p>
      <Button
        size="sm"
        onClick={() => navigate({ to: "/app/billing" })}
      >
        Upgrade Plan
      </Button>
    </div>
  );
}
