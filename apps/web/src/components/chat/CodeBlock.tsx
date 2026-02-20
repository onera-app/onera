import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useState, useCallback, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Highlight code on mount and when code/language changes
  useEffect(() => {
    if (codeRef.current && language) {
      try {
        // Reset any previous highlighting
        codeRef.current.removeAttribute('data-highlighted');
        hljs.highlightElement(codeRef.current);
      } catch {
        // If highlighting fails, just display plain text
      }
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  // Detect language from common aliases
  const displayLanguage = language?.toLowerCase() || 'text';
  const languageLabel = getLanguageLabel(displayLanguage);

  return (
    <div className="group relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-850 my-3 border border-gray-100 dark:border-gray-850">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-850">
        <div className="flex items-center gap-2">
          {filename && (
            <>
              <span className="text-xs text-gray-500 dark:text-gray-400">{filename}</span>
              <span className="text-gray-400 dark:text-gray-500">|</span>
            </>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{languageLabel}</span>
        </div>

        {/* Copy button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className={cn(
            'h-7 px-2 text-xs',
            copied
              ? 'text-status-success hover:text-status-success'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-850'
          )}
        >
          {copied ? (
            <>
              <HugeiconsIcon icon={Tick01Icon} className="h-3.5 w-3.5 mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Copy01Icon} className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className={cn('p-4 text-sm', showLineNumbers && 'pl-12 relative')}>
          {showLineNumbers && (
            <div className="absolute left-0 top-0 pt-4 pb-4 px-3 text-right text-gray-400 dark:text-gray-500 select-none border-r border-gray-100 dark:border-gray-850 bg-gray-50 dark:bg-gray-900">
              {code.split('\n').map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
          )}
          <code
            ref={codeRef}
            className={cn(
              'text-gray-900 dark:text-gray-100 font-mono leading-6',
              language && `language-${displayLanguage}`
            )}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Get a display label for the language
 */
function getLanguageLabel(language: string): string {
  const labels: Record<string, string> = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    tsx: 'TypeScript JSX',
    jsx: 'JavaScript JSX',
    py: 'Python',
    python: 'Python',
    rb: 'Ruby',
    ruby: 'Ruby',
    rs: 'Rust',
    rust: 'Rust',
    go: 'Go',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    csharp: 'C#',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    sass: 'Sass',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    md: 'Markdown',
    markdown: 'Markdown',
    sh: 'Shell',
    bash: 'Bash',
    zsh: 'Zsh',
    powershell: 'PowerShell',
    dockerfile: 'Dockerfile',
    docker: 'Dockerfile',
    text: 'Plain Text',
    plaintext: 'Plain Text',
  };

  return labels[language] || language.charAt(0).toUpperCase() + language.slice(1);
}
