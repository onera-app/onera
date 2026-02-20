import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

interface RouteErrorFallbackProps {
  error: unknown;
  reset?: () => void;
}

export function RouteErrorFallback({ error, reset }: RouteErrorFallbackProps) {
  const message = error instanceof Error ? error.message : "Unexpected route error";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850 p-6 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <HugeiconsIcon icon={Alert01Icon} className="h-5 w-5" />
          <h1 className="font-semibold">Page failed to load</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        <div className="flex gap-2">
          <Button onClick={() => (reset ? reset() : window.location.reload())} className="flex-1">
            Reload
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/app")} className="flex-1">
            Go to App
          </Button>
        </div>
      </div>
    </div>
  );
}
