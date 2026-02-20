import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Loading02Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type ToolState, getToolDisplayName } from "./elements/tool";

export type { ToolState };

export interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  args?: unknown;
  result?: unknown;
  state: ToolState;
  errorText?: string;
}

interface ToolInvocationProps {
  tool: ToolInvocationData;
  defaultOpen?: boolean;
  onApprove?: (toolCallId: string) => void;
  onDeny?: (toolCallId: string) => void;
}

function getStateIcon(state: ToolState) {
  switch (state) {
    case "input-streaming":
      return (
        <HugeiconsIcon
          icon={Loading02Icon}
          className="h-4 w-4 animate-spin text-primary"
        />
      );
    case "input-available":
      return (
        <HugeiconsIcon
          icon={Loading02Icon}
          className="h-4 w-4 animate-spin text-primary"
        />
      );
    case "approval-requested":
      return (
        <HugeiconsIcon
          icon={AlertCircleIcon}
          className="h-4 w-4 text-status-warning-text"
        />
      );
    case "approval-responded":
      return (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={16}
          className="text-primary"
        />
      );
    case "output-available":
      return (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={16}
          className="text-status-success-text"
        />
      );
    case "output-error":
      return (
        <HugeiconsIcon
          icon={CancelCircleIcon}
          className="h-4 w-4 text-destructive"
        />
      );
    case "output-denied":
      return (
        <HugeiconsIcon
          icon={CancelCircleIcon}
          className="h-4 w-4 text-status-warning-text"
        />
      );
    default:
      return (
        <HugeiconsIcon
          icon={AlertCircleIcon}
          className="h-4 w-4 text-gray-500 dark:text-gray-400"
        />
      );
  }
}

function getStateLabel(state: ToolState): string {
  switch (state) {
    case "input-streaming":
      return "Preparing...";
    case "input-available":
      return "Running...";
    case "approval-requested":
      return "Awaiting Approval";
    case "approval-responded":
      return "Approved";
    case "output-available":
      return "Completed";
    case "output-error":
      return "Failed";
    case "output-denied":
      return "Denied";
    default:
      return "Unknown";
  }
}

export const ToolInvocation = memo(function ToolInvocation({
  tool,
  defaultOpen = false,
  onApprove,
  onDeny,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = useState(
    defaultOpen || tool.state === "approval-requested",
  );
  const isLoading =
    tool.state === "input-streaming" || tool.state === "input-available";
  const hasError = tool.state === "output-error";
  const needsApproval = tool.state === "approval-requested";
  const wasDenied = tool.state === "output-denied";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "mb-3 rounded-lg border overflow-hidden",
          hasError
            ? "border-destructive/50 bg-destructive/5"
            : wasDenied
              ? "border-status-warning/40 bg-status-warning/10"
              : needsApproval
                ? "border-status-warning/40 bg-status-warning/10 ring-1 ring-status-warning/30"
                : "border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900",
        )}
      >
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors">
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-90",
            )}
          />
          <HugeiconsIcon
            icon={Wrench01Icon}
            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {getToolDisplayName(tool.toolName)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {getStateIcon(tool.state)}
            <span
              className={cn(
                "text-xs",
                hasError
                  ? "text-destructive"
                  : "text-gray-500 dark:text-gray-400",
              )}
            >
              {getStateLabel(tool.state)}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-100 dark:border-gray-850 px-4 py-3 space-y-3">
            {/* Input/Arguments */}
            {tool.args !== undefined && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Input
                </div>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-x-auto">
                  {typeof tool.args === "string"
                    ? tool.args
                    : JSON.stringify(tool.args, null, 2)}
                </pre>
              </div>
            )}

            {/* Output/Result */}
            {tool.state === "output-available" && tool.result !== undefined && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Output
                </div>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                  {typeof tool.result === "string"
                    ? tool.result
                    : JSON.stringify(tool.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Error */}
            {tool.state === "output-error" && tool.errorText && (
              <div>
                <div className="text-xs font-medium text-destructive mb-1">
                  Error
                </div>
                <pre className="text-xs bg-destructive/10 text-destructive rounded p-2 overflow-x-auto">
                  {tool.errorText}
                </pre>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <HugeiconsIcon
                  icon={Loading02Icon}
                  className="h-3 w-3 animate-spin"
                />
                <span>Executing tool...</span>
              </div>
            )}

            {/* Denied message */}
            {wasDenied && (
              <div className="text-xs text-status-warning-text">
                Tool execution was denied by the user.
              </div>
            )}

            {/* Approval buttons */}
            {needsApproval && onApprove && onDeny && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-850 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeny(tool.toolCallId)}
                >
                  Deny
                </Button>
                <Button size="sm" onClick={() => onApprove(tool.toolCallId)}>
                  Allow
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

interface ToolInvocationsProps {
  tools: ToolInvocationData[];
  defaultOpen?: boolean;
  onApprove?: (toolCallId: string) => void;
  onDeny?: (toolCallId: string) => void;
}

export const ToolInvocations = memo(function ToolInvocations({
  tools,
  defaultOpen = false,
  onApprove,
  onDeny,
}: ToolInvocationsProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="tool-invocations mb-2">
      {tools.map((tool) => (
        <ToolInvocation
          key={tool.toolCallId}
          tool={tool}
          defaultOpen={defaultOpen}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      ))}
    </div>
  );
});

export default ToolInvocations;
