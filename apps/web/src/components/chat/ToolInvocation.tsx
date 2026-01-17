/**
 * ToolInvocation Component
 * Displays tool/function calls and their results from AI responses
 */

import { memo, useState } from 'react';
import { ChevronRight, Wrench, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

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

function getToolDisplayName(toolName: string): string {
  // Convert camelCase/snake_case to readable name
  return toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getStateIcon(state: ToolState) {
  switch (state) {
    case 'input-streaming':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'input-available':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'approval-requested':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'approval-responded':
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case 'output-available':
      return <CheckCircle2 className="h-4 w-4 text-status-success-text" />;
    case 'output-error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'output-denied':
      return <XCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStateLabel(state: ToolState): string {
  switch (state) {
    case 'input-streaming':
      return 'Preparing...';
    case 'input-available':
      return 'Running...';
    case 'approval-requested':
      return 'Awaiting Approval';
    case 'approval-responded':
      return 'Approved';
    case 'output-available':
      return 'Completed';
    case 'output-error':
      return 'Failed';
    case 'output-denied':
      return 'Denied';
    default:
      return 'Unknown';
  }
}

export const ToolInvocation = memo(function ToolInvocation({
  tool,
  defaultOpen = false,
  onApprove,
  onDeny,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || tool.state === 'approval-requested');
  const isLoading = tool.state === 'input-streaming' || tool.state === 'input-available';
  const hasError = tool.state === 'output-error';
  const needsApproval = tool.state === 'approval-requested';
  const wasDenied = tool.state === 'output-denied';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'mb-3 rounded-lg border overflow-hidden',
        hasError ? 'border-destructive/50 bg-destructive/5' :
        wasDenied ? 'border-orange-500/50 bg-orange-500/5' :
        needsApproval ? 'border-yellow-500/50 bg-yellow-500/5 ring-1 ring-yellow-500/20' :
        'border-border/50 bg-muted/30'
      )}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}
          />
          <Wrench className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">
            {getToolDisplayName(tool.toolName)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {getStateIcon(tool.state)}
            <span className={cn(
              'text-xs',
              hasError ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {getStateLabel(tool.state)}
            </span>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50 px-4 py-3 space-y-3">
            {/* Input/Arguments */}
            {tool.args !== undefined && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                <pre className="text-xs bg-background/50 rounded p-2 overflow-x-auto">
                  {typeof tool.args === 'string' ? tool.args : JSON.stringify(tool.args, null, 2)}
                </pre>
              </div>
            )}

            {/* Output/Result */}
            {tool.state === 'output-available' && tool.result !== undefined && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
                <pre className="text-xs bg-background/50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                  {typeof tool.result === 'string'
                    ? tool.result
                    : JSON.stringify(tool.result, null, 2)}
                </pre>
              </div>
            )}

            {/* Error */}
            {tool.state === 'output-error' && tool.errorText && (
              <div>
                <div className="text-xs font-medium text-destructive mb-1">Error</div>
                <pre className="text-xs bg-destructive/10 text-destructive rounded p-2 overflow-x-auto">
                  {tool.errorText}
                </pre>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
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
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 mt-3">
                <button
                  className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => onDeny(tool.toolCallId)}
                  type="button"
                >
                  Deny
                </button>
                <button
                  className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                  onClick={() => onApprove(tool.toolCallId)}
                  type="button"
                >
                  Allow
                </button>
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
