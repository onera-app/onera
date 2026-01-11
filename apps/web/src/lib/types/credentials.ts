// LLM Provider definitions

export interface LLMProvider {
  id: string;
  name: string;
  icon: string;
  fields: {
    key: string;
    label: string;
    type: 'text' | 'password';
    required: boolean;
    placeholder?: string;
  }[];
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
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
    icon: '🧠',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
      },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    fields: [
      {
        key: 'base_url',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:11434',
      },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: '🔀',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-or-...',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    icon: '🔷',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AI...',
      },
    ],
  },
];

// Credential type matching Convex schema
export interface Credential {
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
