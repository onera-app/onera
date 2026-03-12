/**
 * Client-side syntax highlighting using Shiki.
 *
 * Shiki loads themes/grammars asynchronously (WASM), so it can't be used
 * as a rehype plugin with react-markdown (which runs unified synchronously
 * via runSync). Instead, we highlight in a React component after render.
 *
 * Security: Shiki output is sanitized with DOMPurify before DOM insertion.
 */

import { memo, useEffect, useRef, useState, type FC } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface ShikiCodeBlockProps {
  code: string;
  language: string;
}

// Lazy-load the highlighter singleton
let highlighterPromise: Promise<
  Awaited<ReturnType<typeof import("shiki")["createHighlighter"]>>
> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((mod) =>
      mod.createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: [], // Load languages on demand
      }),
    );
  }
  return highlighterPromise;
}

const ShikiCodeBlock: FC<ShikiCodeBlockProps> = ({ code, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const highlighter = await getHighlighter();

        // Load language on demand if not already loaded
        const loadedLangs = highlighter.getLoadedLanguages();
        if (!loadedLangs.includes(language as never)) {
          try {
            await highlighter.loadLanguage(language as never);
          } catch {
            // Language not supported — fall back to plain text
          }
        }

        const html = highlighter.codeToHtml(code, {
          lang: highlighter.getLoadedLanguages().includes(language as never)
            ? language
            : "text",
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
        });

        if (!cancelled && containerRef.current) {
          // Sanitize Shiki's HTML output before inserting into DOM
          const clean = DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
          });
          const container = containerRef.current;
          // Clear previous content safely
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          // Insert sanitized HTML via template element
          const template = document.createElement("template");
          template.innerHTML = clean; // safe: content is DOMPurify-sanitized
          container.appendChild(template.content);
          setHighlighted(true);
        }
      } catch {
        // Shiki failed — leave the plain text fallback visible
      }
    }

    highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className="relative group my-3">
      {/* Header with language + copy */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {language}
        </span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Copy
        </button>
      </div>

      {/* Highlighted code container */}
      <div
        ref={containerRef}
        className={cn(
          "overflow-x-auto rounded-b-lg text-sm",
          "[&>pre]:p-4 [&>pre]:m-0 [&>pre]:rounded-b-lg [&>pre]:overflow-x-auto",
        )}
      >
        {/* Plain text fallback shown until Shiki loads */}
        {!highlighted && (
          <pre className="p-4 m-0 rounded-b-lg overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

export default memo(ShikiCodeBlock);
