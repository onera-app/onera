import { cn } from '@/lib/utils';

interface LLMIconProps {
  model?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isLoading?: boolean;
}

/**
 * Get provider from model name
 */
function getProviderFromModel(model?: string): string {
  if (!model) return 'unknown';
  
  const lower = model.toLowerCase();
  
  if (lower.includes('claude') || lower.includes('anthropic')) return 'anthropic';
  if (lower.includes('gpt') || lower.includes('openai') || lower.includes('o1') || lower.includes('o3')) return 'openai';
  if (lower.includes('gemini') || lower.includes('google')) return 'google';
  if (lower.includes('grok') || lower.includes('xai')) return 'xai';
  if (lower.includes('llama') || lower.includes('meta')) return 'meta';
  if (lower.includes('mistral')) return 'mistral';
  if (lower.includes('deepseek')) return 'deepseek';
  if (lower.includes('qwen')) return 'qwen';
  if (lower === 'ollama') return 'ollama';
  if (lower === 'groq') return 'groq';
  if (lower === 'openrouter') return 'openrouter';
  if (lower === 'together') return 'together';
  if (lower === 'fireworks') return 'fireworks';
  
  return 'unknown';
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
};

const iconSizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * LLM Provider Icon - displays provider-specific icons for AI responses
 */
export function LLMIcon({ model, size = 'md', className, isLoading }: LLMIconProps) {
  const provider = getProviderFromModel(model);
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeClasses[size];

  const baseClass = cn(
    'shrink-0 flex items-center justify-center rounded-full ring-1 ring-white/10',
    sizeClass,
    isLoading && 'animate-pulse',
    className
  );

  switch (provider) {
    case 'openai':
      return (
        <div className={cn(baseClass, 'bg-emerald-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-emerald-400')}>
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
          </svg>
        </div>
      );
    case 'anthropic':
      return (
        <div className={cn(baseClass, 'bg-orange-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-orange-400')}>
            <path d="M13.827 3.52l5.51 16.96H24L18.165 3.52h-4.338zm-9.164 0L0 20.48h4.663l.856-2.752h5.636l.856 2.752h4.663L11.99 3.52H4.663zm2.37 11.456l1.852-5.952 1.852 5.952H6.033z" />
          </svg>
        </div>
      );
    case 'google':
      return (
        <div className={cn(baseClass, 'bg-blue-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-blue-400')}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        </div>
      );
    case 'xai':
      return (
        <div className={cn(baseClass, 'bg-neutral-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-muted-foreground')}>
            <path d="M8 2L2 12l6 10h3l-6-10 6-10H8zm8 0l6 10-6 10h-3l6-10-6-10h3z" />
          </svg>
        </div>
      );
    case 'meta':
      return (
        <div className={cn(baseClass, 'bg-blue-600/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-blue-500')}>
            <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.92 3.78-3.92 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z" />
          </svg>
        </div>
      );
    case 'mistral':
      return (
        <div className={cn(baseClass, 'bg-amber-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-amber-400')}>
            <rect x="2" y="2" width="6" height="6" />
            <rect x="9" y="2" width="6" height="6" />
            <rect x="16" y="2" width="6" height="6" />
            <rect x="2" y="9" width="6" height="6" />
            <rect x="16" y="9" width="6" height="6" />
            <rect x="2" y="16" width="6" height="6" />
            <rect x="9" y="16" width="6" height="6" />
            <rect x="16" y="16" width="6" height="6" />
          </svg>
        </div>
      );
    case 'deepseek':
      return (
        <div className={cn(baseClass, 'bg-cyan-500/15')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={cn(iconSize, 'text-cyan-400')}>
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
      );
    case 'qwen':
      return (
        <div className={cn(baseClass, 'bg-violet-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-violet-400')}>
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
        </div>
      );
    case 'groq':
      return (
        <div className={cn(baseClass, 'bg-purple-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-purple-400')}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      );
    case 'openrouter':
      return (
        <div className={cn(baseClass, 'bg-rose-500/15')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cn(iconSize, 'text-rose-400')}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        </div>
      );
    case 'together':
      return (
        <div className={cn(baseClass, 'bg-indigo-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-indigo-400')}>
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="8" r="3" />
            <circle cx="8" cy="16" r="3" />
            <circle cx="16" cy="16" r="3" />
          </svg>
        </div>
      );
    case 'fireworks':
      return (
        <div className={cn(baseClass, 'bg-red-500/15')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn(iconSize, 'text-red-400')}>
            <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
          </svg>
        </div>
      );
    case 'ollama':
      return (
        <div className={cn(baseClass, 'bg-zinc-500/15')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={cn(iconSize, 'text-zinc-400')}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
        </div>
      );
    default:
      // Fallback sparkles icon for unknown providers
      return (
        <div className={cn(baseClass, 'bg-muted')}>
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={cn(iconSize, 'text-muted-foreground')}
          >
            <path d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z" />
            <path d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z" />
            <path d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z" />
          </svg>
        </div>
      );
  }
}
