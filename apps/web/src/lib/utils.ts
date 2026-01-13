import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for conditionally joining classNames together
 * Uses tailwind-merge to handle conflicting Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp to a relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Provider identification types
 */
export type ProviderId = 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' | 'ollama' | 'openrouter';

export interface ProviderStyle {
  id: ProviderId | 'unknown';
  letter: string;
  name: string;
  bgClass: string;
  textClass: string;
}

const PROVIDER_STYLES: Record<ProviderId, Omit<ProviderStyle, 'id'>> = {
  anthropic: {
    letter: 'C',
    name: 'Claude',
    bgClass: 'bg-provider-anthropic',
    textClass: 'text-provider-anthropic-text',
  },
  openai: {
    letter: 'G',
    name: 'GPT',
    bgClass: 'bg-provider-openai',
    textClass: 'text-provider-openai-text',
  },
  google: {
    letter: 'G',
    name: 'Gemini',
    bgClass: 'bg-provider-google',
    textClass: 'text-provider-google-text',
  },
  meta: {
    letter: 'L',
    name: 'Llama',
    bgClass: 'bg-provider-meta',
    textClass: 'text-provider-meta-text',
  },
  mistral: {
    letter: 'M',
    name: 'Mistral',
    bgClass: 'bg-provider-mistral',
    textClass: 'text-provider-mistral-text',
  },
  ollama: {
    letter: 'O',
    name: 'Ollama',
    bgClass: 'bg-provider-ollama',
    textClass: 'text-provider-ollama-text',
  },
  openrouter: {
    letter: 'R',
    name: 'OpenRouter',
    bgClass: 'bg-provider-openrouter',
    textClass: 'text-provider-openrouter-text',
  },
};

/**
 * Get provider style from model ID or provider name
 * Used for consistent provider avatars and badges across the UI
 */
export function getProviderStyle(modelOrProvider?: string): ProviderStyle {
  if (!modelOrProvider) {
    return {
      id: 'unknown',
      letter: 'AI',
      name: 'Assistant',
      bgClass: 'bg-muted',
      textClass: 'text-muted-foreground',
    };
  }

  const lower = modelOrProvider.toLowerCase();

  if (lower.includes('claude') || lower.includes('anthropic') || lower === 'anthropic') {
    return { id: 'anthropic', ...PROVIDER_STYLES.anthropic };
  }
  if (lower.includes('gpt') || lower.includes('openai') || lower === 'openai') {
    return { id: 'openai', ...PROVIDER_STYLES.openai };
  }
  if (lower.includes('gemini') || lower.includes('google') || lower === 'google') {
    return { id: 'google', ...PROVIDER_STYLES.google };
  }
  if (lower.includes('llama') || lower.includes('meta')) {
    return { id: 'meta', ...PROVIDER_STYLES.meta };
  }
  if (lower.includes('mistral')) {
    return { id: 'mistral', ...PROVIDER_STYLES.mistral };
  }
  if (lower === 'ollama') {
    return { id: 'ollama', ...PROVIDER_STYLES.ollama };
  }
  if (lower === 'openrouter') {
    return { id: 'openrouter', ...PROVIDER_STYLES.openrouter };
  }

  return {
    id: 'unknown',
    letter: 'AI',
    name: formatModelName(modelOrProvider),
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
  };
}

/**
 * Format model name for display
 * Converts model IDs like "claude-3-opus" to "Claude 3 Opus"
 */
export function formatModelName(model?: string): string {
  if (!model) return 'Assistant';

  // Handle provider:model format
  const parts = model.split(':');
  const modelPart = parts.length > 1 ? parts[1] : parts[0];

  return modelPart
    .replace('claude-', 'Claude ')
    .replace('gpt-', 'GPT-')
    .replace('-turbo', ' Turbo')
    .replace('-preview', ' Preview')
    .replace('-latest', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}
