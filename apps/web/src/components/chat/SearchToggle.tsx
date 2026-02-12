/**
 * Search Toggle Component
 * Per-message toggle for web search functionality
 */

import { memo } from "react";
import { Globe, Loader2, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            className="h-8 w-8 text-white/30 rounded-lg"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Configure a search provider in Settings → Tools</p>
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || isSearching}
            className={cn(
              "h-8 w-8 rounded-lg",
              enabled
                ? "text-white bg-white/[0.12] hover:bg-white/[0.18]"
                : "text-white/70 hover:text-white hover:bg-white/[0.08]",
            )}
            onClick={() => onToggle(!enabled)}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled || isSearching}
              className={cn(
                "h-8 w-8 rounded-lg",
                enabled
                  ? "text-white bg-white/[0.12] hover:bg-white/[0.18]"
                  : "text-white/70 hover:text-white hover:bg-white/[0.08]",
              )}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </Button>
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
          {enabled && <Check className="h-4 w-4 ml-2" />}
        </DropdownMenuItem>

        {enabled && availableProviders.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
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
                  <Check className="h-4 w-4 ml-2" />
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
        "bg-primary/10 text-primary text-xs",
        className,
      )}
    >
      <Globe className="h-3 w-3" />
      <span>
        {resultCount} result{resultCount !== 1 ? "s" : ""} via {provider}
      </span>
    </div>
  );
}
