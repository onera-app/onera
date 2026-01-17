/**
 * Onera Shared Types
 */

// User types
export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: 'user' | 'admin';
  profile_image_url?: string;
  created_at: number;
  updated_at: number;
}

// Auth types
export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  name: string;
}

// E2EE Key types
export interface UserKeysPublicResponse {
  user_id: string;
  kek_salt: string;
  kek_ops_limit: number;
  kek_mem_limit: number;
  public_key: string;
  encrypted_master_key: string;
  master_key_nonce: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  encrypted_recovery_key?: string;
  recovery_key_nonce?: string;
  master_key_recovery?: string;
  master_key_recovery_nonce?: string;
}

export interface UserKeysCreateForm {
  kek_salt: string;
  kek_ops_limit: number;
  kek_mem_limit: number;
  encrypted_master_key: string;
  master_key_nonce: string;
  public_key: string;
  encrypted_private_key: string;
  private_key_nonce: string;
  encrypted_recovery_key: string;
  recovery_key_nonce: string;
  master_key_recovery: string;
  master_key_recovery_nonce: string;
}

// Chat types
export interface ChatListItem {
  id: string;
  user_id: string;
  encrypted_title: string;
  title_nonce: string;
  encrypted_chat_key: string;
  chat_key_nonce: string;
  folder_id?: string;
  pinned: boolean;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface EncryptedChat extends ChatListItem {
  encrypted_chat: string;
  chat_nonce: string;
}

export interface DecryptedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  folder_id?: string;
  pinned: boolean;
  archived: boolean;
  created_at: number;
  updated_at: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | MessageContent[];
  created_at: number;
  model?: string;

  // Branching support
  parentId?: string | null;
  childrenIds?: string[];

  // Edit tracking
  edited?: boolean;
  editedAt?: number;

  // Follow-up suggestions (stored on assistant messages)
  followUps?: string[];
}

/**
 * Chat history with message tree structure for branching support
 */
export interface ChatHistory {
  /** The currently displayed leaf message ID */
  currentId: string | null;
  /** Map of message ID to message (tree structure) */
  messages: Record<string, ChatMessage>;
}

export interface MessageContent {
  type: 'text' | 'image_url' | 'document_url' | 'file';
  text?: string;
  image_url?: {
    url: string;
  };
  /** Inline document storage with base64 data URL */
  document_url?: {
    url: string;
    fileName: string;
    mimeType: string;
    extractedText?: string;
  };
  /** Legacy file reference (for external storage) */
  file?: {
    id: string;
    name: string;
    type: string;
  };
}

// Attachment types for file/image uploads
export type AttachmentType = 'image' | 'document' | 'text';

export interface Attachment {
  id: string;
  chatId: string;
  type: AttachmentType;
  mimeType: string;
  fileName: string;
  fileSize: number;
  metadata: {
    width?: number;
    height?: number;
    pageCount?: number;
    extractedText?: string;
  };
  createdAt: number;
}

export interface EncryptedAttachment extends Attachment {
  encryptedData: string;
  iv: string;
}

// Search types
export type SearchProvider = 'exa' | 'brave' | 'tavily' | 'serper' | 'firecrawl';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedDate?: string;
  score?: number;
}

export interface SearchProviderConfig {
  id: SearchProvider;
  name: string;
  enabled: boolean;
  apiKey?: string;
}

export interface ToolsConfig {
  searchEnabled: boolean;
  defaultSearchProvider: SearchProvider | null;
  searchProviders: SearchProviderConfig[];
}

export interface CreateChatForm {
  id?: string;
  encrypted_chat_key: string;
  chat_key_nonce: string;
  encrypted_title: string;
  title_nonce: string;
  encrypted_chat: string;
  chat_nonce: string;
  folder_id?: string;
}

export interface UpdateChatForm {
  encrypted_title?: string;
  title_nonce?: string;
  encrypted_chat?: string;
  chat_nonce?: string;
  folder_id?: string;
  pinned?: boolean;
  archived?: boolean;
}

// Credential types
export interface EncryptedCredential {
  id: string;
  user_id: string;
  provider: LLMProvider;
  name: string;
  encrypted_data: string;
  iv: string;
  created_at: number;
  updated_at: number;
}

export interface LLMCredential {
  id: string;
  provider: LLMProvider;
  name: string;
  apiKey: string;
  baseUrl?: string;
  orgId?: string;
  config?: Record<string, unknown>;
}

export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xai'
  | 'groq'
  | 'mistral'
  | 'deepseek'
  | 'openrouter'
  | 'together'
  | 'fireworks'
  | 'ollama'
  | 'lmstudio'
  | 'azure'
  | 'custom';

export interface CreateCredentialForm {
  provider: LLMProvider;
  name: string;
  encrypted_data: string;
  iv: string;
}

// Folder types
export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id?: string;
  created_at: number;
  updated_at: number;
}

// LLM types
export interface ChatCompletionOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamUpdate {
  done: boolean;
  value: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}
