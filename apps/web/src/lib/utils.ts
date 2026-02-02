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
 * Converts model IDs like "claude-3-opus-20240229" to "Claude 3 Opus"
 */
export function formatModelName(model?: string): string {
  if (!model) return 'Assistant';

  // Handle provider:model format
  const parts = model.split(':');
  let name = parts.length > 1 ? parts[1] : parts[0];

  // Remove date suffixes (e.g., -20240229, -2024-01-01)
  name = name.replace(/-\d{8}$/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');

  // Handle specific model families
  name = name
    // Claude models
    .replace(/^claude-(\d+)-(\d+)-/, 'Claude $1.$2 ')
    .replace(/^claude-(\d+)-/, 'Claude $1 ')
    .replace(/^claude-/, 'Claude ')
    // GPT models
    .replace(/^gpt-(\d+)o/, 'GPT-$1o')
    .replace(/^gpt-(\d+)-/, 'GPT-$1 ')
    .replace(/^gpt-/, 'GPT-')
    .replace(/^o(\d+)-/, 'o$1 ')
    // Llama models
    .replace(/^llama-(\d+)/, 'Llama $1')
    .replace(/^llama(\d+)/, 'Llama $1')
    // Mistral models
    .replace(/^mistral-/, 'Mistral ')
    .replace(/^mixtral-/, 'Mixtral ')
    // Gemini models
    .replace(/^gemini-(\d+)\.(\d+)/, 'Gemini $1.$2')
    .replace(/^gemini-/, 'Gemini ')
    // Common suffixes
    .replace(/-turbo/gi, ' Turbo')
    .replace(/-preview/gi, ' Preview')
    .replace(/-latest/gi, '')
    .replace(/-instruct/gi, ' Instruct')
    .replace(/-chat/gi, '')
    .replace(/-vision/gi, ' Vision')
    .replace(/-mini/gi, ' Mini')
    .replace(/-pro/gi, ' Pro')
    .replace(/-flash/gi, ' Flash')
    .replace(/-sonnet/gi, ' Sonnet')
    .replace(/-opus/gi, ' Opus')
    .replace(/-haiku/gi, ' Haiku');

  // Replace remaining dashes/underscores with spaces
  name = name.replace(/[-_]/g, ' ');

  // Capitalize words, but preserve known acronyms
  name = name
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase();
      // Preserve version numbers and known acronyms
      if (/^\d+(\.\d+)?[a-z]?$/i.test(word)) return word; // e.g., "3.5", "4o"
      if (['GPT', 'AI', 'LLM', 'API'].includes(upper)) return upper;
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Clean up multiple spaces
  return name.replace(/\s+/g, ' ').trim();
}
