import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Unexpected application error",
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application error boundary caught:", error, info);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  private readonly handleGoHome = (): void => {
    window.location.href = "/app";
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div
          className="w-full max-w-md rounded-xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-850 p-6 space-y-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="font-semibold">Something went wrong</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{this.state.message}</p>
          <div className="flex gap-2">
            <Button onClick={this.handleReload} className="flex-1">
              Reload
            </Button>
            <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
              Go to App
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

