import { HugeiconsIcon } from "@hugeicons/react";
import { GlobeIcon, Loading02Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToolsStore, SEARCH_PROVIDERS } from "@/stores/toolsStore";
import { hasSearchCapability, getAvailableProviders } from "@/lib/search";
import type { SearchProvider } from "@onera/types";

interface SearchToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedProvider?: SearchProvider;
  onProviderChange?: (provider: SearchProvider) => void;
  isSearching?: boolean;
  disabled?: boolean;
}

export const SearchToggle = memo(function SearchToggle({
  enabled,
  onToggle,
  selectedProvider,
  onProviderChange,
  isSearching = false,
  disabled = false,
}: SearchToggleProps) {
  const hasCapability = hasSearchCapability();
  const availableProviders = getAvailableProviders();
  const defaultProvider = useToolsStore((s) => s.defaultSearchProvider);

  // If no providers configured, show disabled state
  if (!hasCapability) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled
            className="p-[7px] rounded-full bg-transparent text-gray-400 dark:text-gray-600 transition-colors"
          >
            <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Configure a search provider in Settings &rarr; Tools</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const currentProvider = selectedProvider || defaultProvider;
  const providerName =
    SEARCH_PROVIDERS.find((p) => p.id === currentProvider)?.name ||
    currentProvider ||
    "Search";

  // Simple toggle if only one provider or no provider selection needed
  if (availableProviders.length <= 1 || !onProviderChange) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={disabled || isSearching}
            className={cn(
              "p-[7px] rounded-full transition-colors duration-300 focus:outline-none",
              enabled
                ? "text-sky-500 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-400/10 dark:hover:bg-sky-600/10 border border-sky-200/40 dark:border-sky-500/20"
                : "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
            )}
            onClick={() => onToggle(!enabled)}
          >
            {isSearching ? (
              <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
            ) : (
              <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {enabled
            ? `Web search enabled (${providerName})`
            : "Enable web search"}
        </TooltipContent>
      </Tooltip>
    );
  }

  // Dropdown with provider selection
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              disabled={disabled || isSearching}
              className={cn(
                "p-[7px] rounded-full transition-colors duration-300 focus:outline-none",
                enabled
                  ? "text-sky-500 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-400/10 dark:hover:bg-sky-600/10 border border-sky-200/40 dark:border-sky-500/20"
                  : "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
              )}
            >
              {isSearching ? (
                <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 animate-spin" />
              ) : (
                <HugeiconsIcon icon={GlobeIcon} className="h-4 w-4" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {enabled ? `Web search: ${providerName}` : "Web search"}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Web Search</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onToggle(!enabled)}
          className="flex items-center justify-between"
        >
          <span>{enabled ? "Disable" : "Enable"} search</span>
          {enabled && <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 ml-2" />}
        </DropdownMenuItem>

        {enabled && availableProviders.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400">
              Provider
            </DropdownMenuLabel>
            {availableProviders.map((provider) => (
              <DropdownMenuItem
                key={provider.id}
                onClick={() => onProviderChange(provider.id)}
                className="flex items-center justify-between"
              >
                <span>{provider.name}</span>
                {provider.id === currentProvider && (
                  <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 ml-2" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

/**
 * Search status badge shown in messages
 */
interface SearchBadgeProps {
  provider: string;
  resultCount: number;
  className?: string;
}

export function SearchBadge({
  provider,
  resultCount,
  className,
}: SearchBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full",
        "bg-sky-50 dark:bg-sky-400/10 text-sky-600 dark:text-sky-300 text-xs border border-sky-200/40 dark:border-sky-500/20",
        className,
      )}
    >
      <HugeiconsIcon icon={GlobeIcon} className="h-3 w-3" />
      <span>
        {resultCount} result{resultCount !== 1 ? "s" : ""} via {provider}
      </span>
    </div>
  );
}
