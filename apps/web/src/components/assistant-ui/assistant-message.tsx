/**
 * Custom AssistantMessage component for assistant-ui
 *
 * Renders assistant messages using assistant-ui primitives with existing
 * project components for reasoning, tool calls, sources, and trust badges.
 */

import { type FC, memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  RepeatIcon,
  VolumeHighIcon,
  VolumeOffIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@hugeicons/core-free-icons";
import {
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  useMessage,
  useMessagePartReasoning,
} from "@assistant-ui/react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";

import { cn, formatModelName } from "@/lib/utils";
import { LLMIcon } from "@/components/ui/llm-icon";
import MarkdownText from "./markdown-text";
import { MessageReasoning } from "@/components/chat/MessageReasoning";
import { ToolInvocation, type ToolInvocationData } from "@/components/chat/ToolInvocation";
import { Sources, type Source } from "@/components/chat/Sources";

// ---------------------------------------------------------------------------
// Part renderers
// ---------------------------------------------------------------------------

const ReasoningPart: FC = () => {
  const part = useMessagePartReasoning();
  return (
    <MessageReasoning
      reasoning={part.text}
      isLoading={part.status.type === "running"}
    />
  );
};

const ToolCallPart: FC<ToolCallMessagePartProps> = ({
  toolCallId,
  toolName,
  args,
  result,
  status,
}) => {
  const toolState = (() => {
    if (status.type === "running") return "input-available" as const;
    if (status.type === "incomplete" && status.reason === "error")
      return "output-error" as const;
    if (result !== undefined) return "output-available" as const;
    return "input-available" as const;
  })();

  const tool: ToolInvocationData = {
    toolCallId,
    toolName,
    args,
    result,
    state: toolState,
  };

  return <ToolInvocation tool={tool} />;
};

// ---------------------------------------------------------------------------
// Metadata sections (outside MessagePrimitive.Parts)
// ---------------------------------------------------------------------------

const AssistantMetadata: FC = () => {
  const message = useMessage();
  const sources = message.metadata?.custom?.sources as Source[] | undefined;

  if (!sources || sources.length === 0) return null;

  return <Sources sources={sources} />;
};

// ---------------------------------------------------------------------------
// Branch picker
// ---------------------------------------------------------------------------

const AssistantBranchPicker: FC = () => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className="flex items-center gap-0.5"
    >
      <BranchPickerPrimitive.Previous asChild>
        <button
          type="button"
          className="h-6 w-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="h-3.5 w-3.5" />
        </button>
      </BranchPickerPrimitive.Previous>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums min-w-[2.5rem] text-center">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <button
          type="button"
          className="h-6 w-6 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="h-3.5 w-3.5" />
        </button>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};

// ---------------------------------------------------------------------------
// Action bar
// ---------------------------------------------------------------------------

const actionBtnClass = cn(
  "h-7 w-7 flex items-center justify-center rounded-xl",
  "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
  "hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors",
);

const AssistantActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="flex items-center gap-1 mt-2 opacity-0 group-hover/message:opacity-100 transition-opacity"
    >
      <AssistantBranchPicker />
      <ActionBarPrimitive.Copy asChild>
        <button type="button" className={actionBtnClass} title="Copy">
          <HugeiconsIcon icon={Copy01Icon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload asChild>
        <button type="button" className={actionBtnClass} title="Regenerate">
          <HugeiconsIcon icon={RepeatIcon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.Reload>
      <ActionBarPrimitive.Speak asChild>
        <button type="button" className={actionBtnClass} title="Read aloud">
          <HugeiconsIcon icon={VolumeHighIcon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.Speak>
      <ActionBarPrimitive.StopSpeaking asChild>
        <button type="button" className={actionBtnClass} title="Stop reading">
          <HugeiconsIcon icon={VolumeOffIcon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.StopSpeaking>
      <ActionBarPrimitive.FeedbackPositive asChild>
        <button type="button" className={actionBtnClass} title="Good response">
          <HugeiconsIcon icon={ThumbsUpIcon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.FeedbackPositive>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <button type="button" className={actionBtnClass} title="Poor response">
          <HugeiconsIcon icon={ThumbsDownIcon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.FeedbackNegative>
    </ActionBarPrimitive.Root>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ModelName: FC = () => {
  const message = useMessage();
  const model = message.metadata?.custom?.model as string | undefined;
  const name = formatModelName(model);

  if (!name) return null;

  return (
    <div className="flex items-center gap-1 mb-1 opacity-60">
      <span className="text-[10px] font-bold tracking-tight uppercase text-gray-500 dark:text-gray-400">
        {name}
      </span>
    </div>
  );
};

const AssistantMessage: FC = () => {
  const message = useMessage();
  const model = message.metadata?.custom?.model as string | undefined;
  const isRunning = message.status?.type === "running";

  return (
    <MessagePrimitive.Root className="group/message relative py-2 sm:py-3">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 md:px-6">
        <div className="flex w-full items-start gap-3 sm:gap-3.5">
          <LLMIcon
            model={model}
            size="md"
            isLoading={isRunning}
            className="flex-shrink-0 mt-0.5"
          />
          <div className="flex flex-col w-full min-w-0">
            <ModelName />
            <MessagePrimitive.Parts
              components={{
                Text: MarkdownText,
                Reasoning: ReasoningPart,
                tools: { Fallback: ToolCallPart },
              }}
            />
            <AssistantMetadata />
            <AssistantActionBar />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

export default memo(AssistantMessage);
