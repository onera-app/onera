/**
 * Custom UserMessage component for assistant-ui
 *
 * Renders user messages with text, images, edit actions, and branch picking.
 */

import { type FC, memo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import {
  MessagePrimitive,
  ActionBarPrimitive,
  BranchPickerPrimitive,
  ComposerPrimitive,
  useMessagePartText,
  useMessagePartImage,
} from "@assistant-ui/react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Part renderers
// ---------------------------------------------------------------------------

const UserTextPart: FC = () => {
  const part = useMessagePartText();
  return (
    <p className="whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-100">
      {part.text}
    </p>
  );
};

const UserImagePart: FC = () => {
  const part = useMessagePartImage();
  return (
    <img
      src={part.image}
      alt="User attachment"
      className="max-w-sm rounded-lg border border-gray-200 dark:border-gray-700 mt-2"
    />
  );
};

// ---------------------------------------------------------------------------
// Branch picker
// ---------------------------------------------------------------------------

const UserBranchPicker: FC = () => {
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

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="flex items-center gap-1 mt-2 opacity-0 group-hover/message:opacity-100 transition-opacity"
    >
      <UserBranchPicker />
      <ActionBarPrimitive.Edit asChild>
        <button
          type="button"
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-xl",
            "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
            "hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors",
          )}
        >
          <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
        </button>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

// ---------------------------------------------------------------------------
// Edit composer (shown when user clicks Edit)
// ---------------------------------------------------------------------------

const UserEditComposer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
      <ComposerPrimitive.Input
        className="w-full bg-transparent resize-none border-0 shadow-none p-0 text-sm leading-relaxed placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none min-h-[60px]"
      />
      <div className="flex justify-end gap-2">
        <ComposerPrimitive.Cancel asChild>
          <button
            type="button"
            className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Cancel
          </button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <button
            type="button"
            className="px-3 py-1.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
          >
            Save & Submit
          </button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="group/message relative py-2 sm:py-3">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 md:px-6">
        <div className="flex justify-end">
          <div className="flex flex-col items-end max-w-[90%] sm:max-w-[min(fit-content,80%)]">
            <div
              className={cn(
                "rounded-2xl px-4 py-3",
                "bg-gray-100 dark:bg-gray-850",
                "text-gray-900 dark:text-gray-100",
              )}
            >
              <MessagePrimitive.Parts
                components={{
                  Text: UserTextPart,
                  Image: UserImagePart,
                }}
              />
            </div>
            <UserActionBar />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

export { UserEditComposer };
export default memo(UserMessage);
