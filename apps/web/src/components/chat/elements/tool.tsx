/**
 * Tool Component
 * Displays tool invocations with approval/denial workflow
 * Adapted from Vercel AI Chatbot
 */

import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-error'
  | 'output-denied';

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn('not-prose mb-4 w-full rounded-md border', className)}
    {...props}
  />
);

export type ToolHeaderProps = {
  toolName: string;
  state: ToolState;
  className?: string;
};

export function getToolDisplayName(toolName: string): string {
  // Remove common prefixes like 'tool-' or 'tool_'
  const cleaned = toolName.replace(/^tool[-_]/, '');
  // Convert camelCase/snake_case to readable name
  return cleaned
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^\s+/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const getStatusBadge = (status: ToolState) => {
  const labels: Record<ToolState, string> = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'approval-requested': 'Awaiting Approval',
    'approval-responded': 'Approved',
    'output-available': 'Completed',
    'output-error': 'Error',
    'output-denied': 'Denied',
  };

  const icons: Record<ToolState, ReactNode> = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'approval-requested': <ClockIcon className="size-4 text-status-warning-text" />,
    'approval-responded': <CheckCircleIcon className="size-4 text-primary" />,
    'output-available': <CheckCircleIcon className="size-4 text-status-success-text" />,
    'output-error': <XCircleIcon className="size-4 text-destructive" />,
    'output-denied': <XCircleIcon className="size-4 text-status-warning-text" />,
  };

  return (
    <Badge
      className="flex items-center gap-1 rounded-full text-xs"
      variant="secondary"
    >
      {icons[status]}
      <span>{labels[status]}</span>
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  toolName,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full min-w-0 items-center justify-between gap-2 p-3 group',
      className
    )}
    {...props}
  >
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <WrenchIcon className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
      <span className="truncate font-medium text-sm">{getToolDisplayName(toolName)}</span>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {getStatusBadge(state)}
      <ChevronDownIcon className="size-4 text-gray-500 dark:text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
    </div>
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-gray-700 dark:text-gray-200 outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: unknown;
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 overflow-hidden p-4', className)} {...props}>
    <h4 className="font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <pre className="overflow-x-auto rounded-md bg-gray-50 dark:bg-gray-850 p-3 font-mono text-xs">
      {JSON.stringify(input, null, 2)}
    </pre>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ReactNode;
  errorText?: string;
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  return (
    <div className={cn('space-y-2 p-4', className)} {...props}>
      <h4 className="font-medium text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-x-auto rounded-md text-xs [&_table]:w-full',
          errorText
            ? 'bg-destructive/10 text-destructive p-3'
            : 'bg-gray-50 dark:bg-gray-850 text-gray-900 dark:text-gray-100'
        )}
      >
        {errorText && <div>{errorText}</div>}
        {output && <div>{output}</div>}
      </div>
    </div>
  );
};

export type ToolApprovalProps = {
  onApprove: () => void;
  onDeny: () => void;
};

export const ToolApproval = ({ onApprove, onDeny }: ToolApprovalProps) => (
  <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
    <Button
      variant="ghost"
      size="sm"
      onClick={onDeny}
    >
      Deny
    </Button>
    <Button
      size="sm"
      onClick={onApprove}
    >
      Allow
    </Button>
  </div>
);
