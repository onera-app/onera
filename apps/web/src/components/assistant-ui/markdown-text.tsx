import { type FC, memo, lazy, Suspense } from "react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const MermaidDiagram = lazy(() => import("./mermaid-diagram"));
const ShikiCodeBlock = lazy(() => import("./shiki-code-block"));

const MarkdownText: FC = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
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
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                {children}
              </code>
            );
          }

          const language = className?.replace("language-", "") || "";
          const codeText = String(children).replace(/\n$/, "");

          // Mermaid diagrams
          if (language === "mermaid") {
            return (
              <Suspense
                fallback={
                  <div className="my-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 animate-pulse">
                    <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                }
              >
                <MermaidDiagram code={codeText} />
              </Suspense>
            );
          }

          // Syntax-highlighted code blocks (Shiki, client-side async)
          if (language) {
            return (
              <Suspense
                fallback={
                  <div className="relative group my-3">
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{language}</span>
                    </div>
                    <pre className="p-4 rounded-b-lg overflow-x-auto bg-gray-50 dark:bg-gray-900 text-sm font-mono text-gray-800 dark:text-gray-200">
                      <code>{codeText}</code>
                    </pre>
                  </div>
                }
              >
                <ShikiCodeBlock code={codeText} language={language} />
              </Suspense>
            );
          }

          // No language specified — plain code block
          return (
            <pre className="my-3 p-4 rounded-lg overflow-x-auto bg-gray-50 dark:bg-gray-900 text-sm font-mono text-gray-800 dark:text-gray-200">
              <code>{children}</code>
            </pre>
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
