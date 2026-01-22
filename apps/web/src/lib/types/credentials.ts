// LLM Provider definitions

export type ProviderCategory = 'popular' | 'opensource' | 'aggregator' | 'local';

export interface LLMProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ProviderCategory;
  website?: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password';
    required: boolean;
    placeholder?: string;
    helpText?: string;
  }[];
}

export const PROVIDER_CATEGORIES: { id: ProviderCategory; name: string; description: string }[] = [
  { id: 'popular', name: 'Popular', description: 'Most commonly used AI providers' },
  { id: 'opensource', name: 'Open Source', description: 'Open-source and open-weight model providers' },
  { id: 'aggregator', name: 'Aggregators', description: 'Access multiple providers through one API' },
  { id: 'local', name: 'Local', description: 'Run models locally on your machine' },
];

export const LLM_PROVIDERS: LLMProvider[] = [
  // Popular providers
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, o1, o3, and other OpenAI models',
    icon: 'openai',
    category: 'popular',
    website: 'https://platform.openai.com/api-keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Get your API key from platform.openai.com',
      },
      {
        key: 'organization',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-... (optional)',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 4, Claude 3.7, and other Claude models',
    icon: 'anthropic',
    category: 'popular',
    website: 'https://console.anthropic.com/settings/keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
        helpText: 'Get your API key from console.anthropic.com',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.0, Gemini 1.5, and other Google models',
    icon: 'google',
    category: 'popular',
    website: 'https://aistudio.google.com/apikey',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AI...',
        helpText: 'Get your API key from Google AI Studio',
      },
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    description: 'Grok 2, Grok 3, and other xAI models',
    icon: 'xai',
    category: 'popular',
    website: 'https://console.x.ai',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'xai-...',
        helpText: 'Get your API key from console.x.ai',
      },
    ],
  },

  // Open source / Open weight providers
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference for Llama, Mixtral, and more',
    icon: 'groq',
    category: 'opensource',
    website: 'https://console.groq.com/keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'gsk_...',
        helpText: 'Get your API key from console.groq.com',
      },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Codestral, and other Mistral models',
    icon: 'mistral',
    category: 'opensource',
    website: 'https://console.mistral.ai/api-keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Get your API key from console.mistral.ai',
      },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V3, DeepSeek Coder, and reasoning models',
    icon: 'deepseek',
    category: 'opensource',
    website: 'https://platform.deepseek.com/api_keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Get your API key from platform.deepseek.com',
      },
    ],
  },

  // Aggregators
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 200+ models from multiple providers',
    icon: 'openrouter',
    category: 'aggregator',
    website: 'https://openrouter.ai/keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-or-...',
        helpText: 'Get your API key from openrouter.ai',
      },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Llama, Qwen, and 100+ open-source models',
    icon: 'together',
    category: 'aggregator',
    website: 'https://api.together.xyz/settings/api-keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        helpText: 'Get your API key from together.ai',
      },
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference for Llama, Mixtral, and custom models',
    icon: 'fireworks',
    category: 'aggregator',
    website: 'https://fireworks.ai/api-keys',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'fw_...',
        helpText: 'Get your API key from fireworks.ai',
      },
    ],
  },

  // Local
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run Llama, Mistral, and other models locally',
    icon: 'ollama',
    category: 'local',
    website: 'https://ollama.ai',
    fields: [
      {
        key: 'base_url',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:11434',
        helpText: 'Default: http://localhost:11434',
      },
    ],
  },
  {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Run local models with LM Studio server',
    icon: 'lmstudio',
    category: 'local',
    website: 'https://lmstudio.ai',
    fields: [
      {
        key: 'base_url',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:1234/v1',
        helpText: 'Default: http://localhost:1234/v1',
      },
    ],
  },

  // Custom OpenAI-compatible
  {
    id: 'custom',
    name: 'Custom (OpenAI-compatible)',
    description: 'Any OpenAI-compatible API endpoint',
    icon: 'custom',
    category: 'aggregator',
    fields: [
      {
        key: 'base_url',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'https://api.example.com/v1',
        helpText: 'The base URL of your OpenAI-compatible API',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: false,
        placeholder: 'Optional API key',
      },
    ],
  },
];

// Credential type matching server schema
export interface Credential {
  id: string;
  // Legacy plaintext fields (nullable - cleared when encrypted)
  provider: string | null;
  name: string | null;
  // Encrypted metadata fields
  encryptedName: string | null;
  nameNonce: string | null;
  encryptedProvider: string | null;
  providerNonce: string | null;
  // Encrypted API key data
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

// Decrypted credential type for client-side use
export interface DecryptedCredential {
  id: string;
  provider: string;
  name: string;
  encryptedData: string;
  iv: string;
  createdAt: number;
  updatedAt: number;
}

// Folder type matching Convex schema
export interface Folder {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// Chat type matching Convex schema
export interface Chat {
  id: string;
  userId: string;
  encryptedTitle: string;
  titleNonce: string;
  encryptedChatKey: string;
  chatKeyNonce: string;
  encryptedChat?: string;
  chatNonce?: string;
  folderId: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

// Note type matching Convex schema
export interface Note {
  id: string;
  userId: string;
  encryptedTitle: string;
  titleNonce: string;
  encryptedContent: string;
  contentNonce: string;
  folderId: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

// Prompt type matching Convex schema
export interface Prompt {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  content: string;
  createdAt: number;
  updatedAt: number;
}
