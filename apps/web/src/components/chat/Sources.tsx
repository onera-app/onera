import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileAttachmentIcon,
  GlobeIcon,
  LinkSquare01Icon,
  NewsIcon,
} from "@hugeicons/core-free-icons";
import { memo } from "react";
import { cn } from "@/lib/utils";

export interface Source {
  sourceType: "url" | "x-post" | "news-article" | string;
  url?: string;
  title?: string;
  domain?: string;
}

interface SourcesProps {
  sources: Source[];
  className?: string;
}

function getSourceIcon(sourceType: string) {
  switch (sourceType) {
    case "news-article":
      return NewsIcon;
    case "x-post":
      return FileAttachmentIcon;
    default:
      return GlobeIcon;
  }
}

function getDomainFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const Sources = memo(function Sources({
  sources,
  className,
}: SourcesProps) {
  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by URL
  const uniqueSources = sources.reduce<Source[]>((acc, source) => {
    if (source.url && !acc.some((s) => s.url === source.url)) {
      acc.push(source);
    }
    return acc;
  }, []);

  if (uniqueSources.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-4 pt-3 border-t border-gray-100 dark:border-gray-850",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <HugeiconsIcon
          icon={LinkSquare01Icon}
          className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
        />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Sources
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueSources.map((source, index) => {
          const sourceIcon = getSourceIcon(source.sourceType);
          const domain =
            source.domain ||
            (source.url ? getDomainFromUrl(source.url) : "Unknown");

          return (
            <a
              key={source.url || index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                "text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                "bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-850 transition-colors",
                "border border-gray-100 dark:border-gray-850 hover:border-gray-200 dark:hover:border-gray-800",
                "max-w-[200px] truncate",
              )}
              title={source.title || source.url}
            >
              <HugeiconsIcon icon={sourceIcon} size={12} className="shrink-0" />
              <span className="truncate">{source.title || domain}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
});
