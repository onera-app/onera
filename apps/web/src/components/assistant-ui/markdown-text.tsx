import { type FC, memo, lazy, Suspense } from "react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@shikijs/rehype";
import "katex/dist/katex.min.css";

const MermaidDiagram = lazy(() => import("./mermaid-diagram"));

const MarkdownText: FC = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        rehypeKatex,
        [
          rehypeShiki,
          {
            themes: {
              light: "github-light",
              dark: "github-dark",
            },
          },
        ],
      ]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold mt-5 mb-2 text-gray-900 dark:text-gray-100">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-gray-900 dark:text-gray-100">
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-900 dark:text-gray-100">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-900 dark:text-gray-100">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-3 italic text-gray-600 dark:text-gray-400">
            {children}
          </blockquote>
        ),
        pre: ({ children }) => {
          // rehype-shiki wraps highlighted code in <pre>, pass through as-is
          return (
            <div className="relative group my-3 overflow-x-auto rounded-lg [&>pre]:p-4 [&>pre]:text-sm [&>pre]:rounded-lg">
              {children}
            </div>
          );
        },
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                {children}
              </code>
            );
          }

          // Check for mermaid diagrams
          const language = className?.replace("language-", "") || "";
          if (language === "mermaid") {
            const code = String(children).replace(/\n$/, "");
            return (
              <Suspense
                fallback={
                  <div className="my-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 animate-pulse">
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                }
              >
                <MermaidDiagram code={code} />
              </Suspense>
            );
          }

          // For non-shiki code blocks (fallback if rehype-shiki doesn't process)
          return (
            <div className="relative group my-3">
              {language && (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {language}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        String(children).replace(/\n$/, ""),
                      )
                    }
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Copy
                  </button>
                </div>
              )}
              <pre
                className={`bg-gray-50 dark:bg-gray-900 p-4 overflow-x-auto text-sm font-mono text-gray-800 dark:text-gray-200 ${language ? "rounded-b-lg" : "rounded-lg"}`}
              >
                <code>{children}</code>
              </pre>
            </div>
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
            {children}
          </td>
        ),
      }}
    />
  );
};

export default memo(MarkdownText);
