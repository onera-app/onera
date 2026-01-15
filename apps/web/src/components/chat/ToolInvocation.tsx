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
  | 'output-available'
  | 'output-error';

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
    case 'output-available':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'output-error':
      return <XCircle className="h-4 w-4 text-destructive" />;
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
    case 'output-available':
      return 'Completed';
    case 'output-error':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

export const ToolInvocation = memo(function ToolInvocation({
  tool,
  defaultOpen = false,
}: ToolInvocationProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isLoading = tool.state === 'input-streaming' || tool.state === 'input-available';
  const hasError = tool.state === 'output-error';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'mb-3 rounded-lg border overflow-hidden',
        hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border/50 bg-muted/30'
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
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});

interface ToolInvocationsProps {
  tools: ToolInvocationData[];
  defaultOpen?: boolean;
}

export const ToolInvocations = memo(function ToolInvocations({
  tools,
  defaultOpen = false,
}: ToolInvocationsProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="tool-invocations mb-2">
      {tools.map((tool) => (
        <ToolInvocation key={tool.toolCallId} tool={tool} defaultOpen={defaultOpen} />
      ))}
    </div>
  );
});

export default ToolInvocations;
