import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface RouteErrorFallbackProps {
  error: unknown;
  reset?: () => void;
}

export function RouteErrorFallback({ error, reset }: RouteErrorFallbackProps) {
  const message = error instanceof Error ? error.message : "Unexpected route error";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h1 className="font-semibold">Page failed to load</h1>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
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
