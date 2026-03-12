/**
 * Rich Tool UI components using makeAssistantToolUI.
 *
 * These register custom renderers for specific tools, replacing
 * the generic JSON-display fallback with purpose-built UI.
 *
 * Place these components inside <AssistantRuntimeProvider> to register them.
 */

import { type FC, memo } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GlobeIcon,
  Loading02Icon,
  CheckmarkCircle02Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

/**
 * Google Search tool UI — renders search grounding results
 * Tool name: google_search (from @ai-sdk/google's google.tools.googleSearch)
 */
export const GoogleSearchToolUI = makeAssistantToolUI({
  toolName: "google_search",
  render: ({ status, result }) => {
    const isRunning = status.type === "running";

    return (
      <div
        className={cn(
          "mb-3 rounded-lg border overflow-hidden",
          "border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <HugeiconsIcon
            icon={GlobeIcon}
            className="h-4 w-4 shrink-0 text-blue-500"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Google Search
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isRunning ? (
              <>
                <HugeiconsIcon
                  icon={Loading02Icon}
                  className="h-4 w-4 animate-spin text-blue-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Searching...
                </span>
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="h-4 w-4 text-green-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Done
                </span>
              </>
            )}
          </div>
        </div>

        {!isRunning && result != null && (
          <SearchResults result={result as Record<string, unknown>} />
        )}
      </div>
    );
  },
});

/**
 * xAI Web Search tool UI — renders Grok web search results
 * Tool name: web_search (from @ai-sdk/xai's xai.tools.webSearch)
 */
export const WebSearchToolUI = makeAssistantToolUI({
  toolName: "web_search",
  render: ({ status, result }) => {
    const isRunning = status.type === "running";

    return (
      <div
        className={cn(
          "mb-3 rounded-lg border overflow-hidden",
          "border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900",
        )}
      >
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            className="h-4 w-4 shrink-0 text-blue-500"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            Web Search
          </span>
          <div className="ml-auto flex items-center gap-2">
            {isRunning ? (
              <>
                <HugeiconsIcon
                  icon={Loading02Icon}
                  className="h-4 w-4 animate-spin text-blue-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Searching...
                </span>
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  className="h-4 w-4 text-green-500"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Done
                </span>
              </>
            )}
          </div>
        </div>

        {!isRunning && result != null && (
          <SearchResults result={result as Record<string, unknown>} />
        )}
      </div>
    );
  },
});

/**
 * Shared search results renderer.
 * Handles various result shapes from different search providers.
 */
const SearchResults: FC<{ result: unknown }> = memo(({ result }) => {
  const items = extractSearchItems(result);
  if (items.length === 0) return null;

  return (
    <div className="border-t border-gray-100 dark:border-gray-850 px-3 py-2 space-y-2">
      {items.slice(0, 5).map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors"
        >
          <HugeiconsIcon
            icon={GlobeIcon}
            className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400"
          />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title || item.url}
            </div>
            {item.snippet && (
              <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                {item.snippet}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
});

interface SearchItem {
  url: string;
  title?: string;
  snippet?: string;
}

function extractSearchItems(result: unknown): SearchItem[] {
  if (!result || typeof result !== "object") return [];

  // Handle array of results directly
  if (Array.isArray(result)) {
    return result
      .filter((r) => r && typeof r === "object" && ("url" in r || "link" in r))
      .map((r) => ({
        url: (r as Record<string, string>).url || (r as Record<string, string>).link || "",
        title: (r as Record<string, string>).title || (r as Record<string, string>).name,
        snippet: (r as Record<string, string>).snippet || (r as Record<string, string>).description || (r as Record<string, string>).content,
      }));
  }

  // Handle nested { results: [...] } or { items: [...] }
  const obj = result as Record<string, unknown>;
  if (Array.isArray(obj.results)) return extractSearchItems(obj.results);
  if (Array.isArray(obj.items)) return extractSearchItems(obj.items);
  if (Array.isArray(obj.webPages)) return extractSearchItems(obj.webPages);

  return [];
}
