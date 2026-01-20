import { useState, useCallback, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

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
    <div className="group relative rounded-lg overflow-hidden bg-muted/60 dark:bg-muted/40 my-3 border border-border">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/80 dark:bg-muted/60 border-b border-border">
        <div className="flex items-center gap-2">
          {filename && (
            <>
              <span className="text-xs text-muted-foreground">{filename}</span>
              <span className="text-muted-foreground/50">|</span>
            </>
          )}
          <span className="text-xs text-muted-foreground font-mono">{languageLabel}</span>
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
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className={cn('p-4 text-sm', showLineNumbers && 'pl-12 relative')}>
          {showLineNumbers && (
            <div className="absolute left-0 top-0 pt-4 pb-4 px-3 text-right text-muted-foreground/60 select-none border-r border-border bg-muted/30">
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
              'text-foreground font-mono leading-6',
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
