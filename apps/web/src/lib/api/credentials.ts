import { api } from './client';

export interface Credential {
  id: string;
  provider: string;
  name: string;
  encrypted_data: string;
  iv: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialCreate {
  provider: string;
  name: string;
  encrypted_data: string;
  iv: string;
}

export const credentialsApi = {
  getAll: (token: string) =>
    api.get<Credential[]>('/credentials', token),

  create: (data: CredentialCreate, token: string) =>
    api.post<Credential>('/credentials', data, token),

  update: (id: string, data: CredentialCreate, token: string) =>
    api.post<Credential>(`/credentials/${id}`, data, token),

  delete: (id: string, token: string) =>
    api.delete<{ success: boolean }>(`/credentials/${id}`, token),
};

// Supported LLM providers
export const LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5, and other OpenAI models',
    icon: 'openai',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'organization', label: 'Organization ID', type: 'text', required: false },
      { key: 'base_url', label: 'Base URL', type: 'text', required: false, placeholder: 'https://api.openai.com/v1' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude and other Anthropic models',
    icon: 'anthropic',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'base_url', label: 'Base URL', type: 'text', required: false, placeholder: 'https://api.anthropic.com' },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local models via Ollama',
    icon: 'ollama',
    fields: [
      { key: 'base_url', label: 'Base URL', type: 'text', required: true, placeholder: 'http://localhost:11434' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access multiple providers through OpenRouter',
    icon: 'openrouter',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini and other Google AI models',
    icon: 'google',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
] as const;

export type LLMProvider = typeof LLM_PROVIDERS[number]['id'];
