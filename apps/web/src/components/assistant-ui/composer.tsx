/**
 * Custom Composer component for assistant-ui
 *
 * Provides the message input area with model selector, search toggle,
 * send/stop buttons, and iOS-style glassmorphism on mobile.
 */

import { type FC, memo, useCallback, useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  SecurityCheckIcon,
  SquareIcon,
} from "@hugeicons/core-free-icons";
import {
  ComposerPrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { SearchToggle } from "@/components/chat/SearchToggle";
import { useModelStore } from "@/stores/modelStore";
import { useToolsStore } from "@/stores/toolsStore";
import { isPrivateModel } from "@/lib/ai/credentials";
import { analytics } from "@/lib/analytics";
import type { SearchProvider } from "@onera/types";

// ---------------------------------------------------------------------------
// Send button (shown when not running)
// ---------------------------------------------------------------------------

const SendButton: FC = () => {
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const showPrivate = selectedModelId ? isPrivateModel(selectedModelId) : false;
  const [showEncryptPulse, setShowEncryptPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Brief encrypt pulse on send for private models
  const handleClick = useCallback(() => {
    if (showPrivate) {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      setShowEncryptPulse(true);
      pulseTimerRef.current = setTimeout(() => setShowEncryptPulse(false), 400);
    }
  }, [showPrivate]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  return (
    <ComposerPrimitive.Send asChild onClick={handleClick}>
      <button
        type="button"
        className={cn(
          "transition rounded-full p-1.5 self-center",
          "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100",
          "disabled:text-gray-400 disabled:bg-gray-200 disabled:dark:text-gray-600 disabled:dark:bg-gray-700 disabled:cursor-not-allowed",
          showEncryptPulse && "encrypt-pulse",
        )}
      >
        {showEncryptPulse ? (
          <HugeiconsIcon
            icon={SecurityCheckIcon}
            className="h-4 w-4 text-green-400"
            strokeWidth={2.5}
          />
        ) : (
          <HugeiconsIcon icon={ArrowUp01Icon} className="h-4 w-4" strokeWidth={2.5} />
        )}
      </button>
    </ComposerPrimitive.Send>
  );
};

// ---------------------------------------------------------------------------
// Stop button (shown when running)
// ---------------------------------------------------------------------------

const StopButton: FC = () => {
  const handleStop = useCallback(() => {
    analytics.chat.messageStreamStopped();
  }, []);

  return (
    <ComposerPrimitive.Cancel asChild onClick={handleStop}>
      <button
        type="button"
        className="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-full p-1.5 self-center"
      >
        <HugeiconsIcon icon={SquareIcon} className="h-4 w-4 fill-current" />
      </button>
    </ComposerPrimitive.Cancel>
  );
};

// ---------------------------------------------------------------------------
// Model selector wrapper
// ---------------------------------------------------------------------------

const ComposerModelSelector: FC = () => {
  const selectedModelId = useModelStore((s) => s.selectedModelId);
  const setSelectedModel = useModelStore((s) => s.setSelectedModel);

  return (
    <ModelSelector
      value={selectedModelId ?? ""}
      onChange={setSelectedModel}
    />
  );
};

// ---------------------------------------------------------------------------
// Search toggle wrapper
// ---------------------------------------------------------------------------

const ComposerSearchToggle: FC = () => {
  const defaultProvider = useToolsStore((s) => s.defaultSearchProvider);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState<SearchProvider | undefined>(
    defaultProvider || undefined,
  );

  return (
    <SearchToggle
      enabled={searchEnabled}
      onToggle={setSearchEnabled}
      selectedProvider={searchProvider}
      onProviderChange={setSearchProvider}
    />
  );
};

// ---------------------------------------------------------------------------
// Main Composer
// ---------------------------------------------------------------------------

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root
      className={cn(
        "relative flex-1 flex flex-col w-full transition-all duration-300 px-1 py-1",
        // Mobile: native bar
        "rounded-[28px] border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 shadow-none sm:px-1.5 sm:py-1.5",
        // Desktop: glassmorphism
        "sm:bg-white/80 sm:dark:bg-gray-900/80 sm:backdrop-blur-xl sm:text-gray-900 sm:dark:text-gray-100",
        "sm:shadow-[0_8px_30px_rgb(0,0,0,0.06)] sm:dark:shadow-[0_8px_30px_rgb(0,0,0,0.16)]",
        "border-gray-200/50 dark:border-gray-700/50",
        "hover:border-gray-300/60 dark:hover:border-gray-600/60",
        "sm:hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] sm:dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)]",
      )}
    >
      {/* Textarea */}
      <div className="px-2.5 pt-2.5 pb-1">
        <ComposerPrimitive.Input
          autoFocus
          placeholder="Message Onera..."
          className={cn(
            "w-full bg-transparent resize-none border-0 shadow-none p-0",
            "max-h-[96px] sm:max-h-[120px] min-h-[24px]",
            "text-sm leading-relaxed",
            "placeholder:text-gray-300 dark:placeholder:text-gray-600",
            "focus:outline-none",
          )}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="flex justify-between mt-0.5 mb-2.5 mx-0.5 max-w-full">
        {/* Left side: model selector + search toggle */}
        <div className="ml-1 self-end flex items-center flex-1 max-w-[80%] gap-[0.5px]">
          <ComposerModelSelector />
          <div className="flex self-center w-[1px] h-4 mx-1 bg-gray-200/50 dark:bg-gray-800/50" />
          <ComposerSearchToggle />
        </div>

        {/* Right side: send / stop */}
        <div className="self-end flex space-x-1 mr-1 shrink-0 gap-[0.5px]">
          <ThreadPrimitive.If running={false}>
            <SendButton />
          </ThreadPrimitive.If>
          <ThreadPrimitive.If running>
            <StopButton />
          </ThreadPrimitive.If>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
};

export default memo(Composer);
