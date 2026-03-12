import { memo, useEffect, useRef, useState, type FC } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  code: string;
}

const MermaidDiagram: FC<MermaidDiagramProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "strict",
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg } = await mermaid.render(id, code);

        if (!cancelled && container) {
          // Sanitize SVG output with DOMPurify before inserting into DOM
          const clean = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
          });
          container.textContent = "";
          const template = document.createElement("template");
          template.innerHTML = clean;
          container.appendChild(template.content);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          if (container) container.textContent = "";
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to render diagram
        </p>
        <pre className="mt-2 text-xs text-red-500 dark:text-red-400 overflow-x-auto">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "my-3 flex justify-center overflow-x-auto rounded-lg",
        "bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700",
      )}
    />
  );
};

export default memo(MermaidDiagram);
