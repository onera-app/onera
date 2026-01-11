import { useState, useCallback, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { cn } from '@/lib/utils';

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
    <div className="group relative rounded-lg overflow-hidden bg-gray-900 dark:bg-gray-950 my-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {filename && (
            <>
              <span className="text-xs text-gray-400">{filename}</span>
              <span className="text-gray-600">|</span>
            </>
          )}
          <span className="text-xs text-gray-500 font-mono">{languageLabel}</span>
        </div>

        {/* Copy button - always visible */}
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
            copied
              ? 'text-success bg-success/10'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className={cn('p-4 text-sm', showLineNumbers && 'pl-12 relative')}>
          {showLineNumbers && (
            <div className="absolute left-0 top-0 pt-4 pb-4 px-3 text-right text-gray-600 select-none border-r border-gray-700 bg-gray-900/50">
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
              'text-gray-100 font-mono leading-6',
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
