/**
 * Chat Service - Handles LLM interactions with streaming
 */

import type { ChatMessage as LLMMessage, StreamUpdate, LLMCredential } from '@cortex/llm-client';
import { DirectLLMClient } from '@cortex/llm-client';
import { decryptCredentials, isUnlocked } from '@cortex/crypto';
import type { ChatMessage, LLMProvider } from '@cortex/types';
import { credentialsApi } from '@/lib/api';

// Singleton client instance
let llmClient: DirectLLMClient | null = null;
let cachedCredentials: LLMCredential[] = [];

/**
 * Convert decrypted credentials from crypto format to LLM client format
 */
function toClientCredentials(
  decrypted: Array<{
    id: string;
    provider: string;
    name: string;
    api_key: string;
    base_url?: string;
    org_id?: string;
    config?: Record<string, unknown>;
  }>
): LLMCredential[] {
  return decrypted.map((cred) => ({
    id: cred.id,
    provider: cred.provider as LLMProvider,
    name: cred.name,
    apiKey: cred.api_key,
    baseUrl: cred.base_url || getDefaultBaseUrl(cred.provider),
    orgId: cred.org_id,
    config: cred.config,
  }));
}

/**
 * Get default base URL for a provider
 */
function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'ollama':
      return 'http://localhost:11434';
    default:
      return '';
  }
}

/**
 * Initialize or get the LLM client
 */
export async function getLLMClient(token: string): Promise<DirectLLMClient | null> {
  if (!isUnlocked()) {
    console.warn('E2EE not unlocked, cannot initialize LLM client');
    return null;
  }

  // Return cached client if credentials haven't changed
  if (llmClient && cachedCredentials.length > 0) {
    return llmClient;
  }

  try {
    // Fetch encrypted credentials from server
    const encryptedCredentials = await credentialsApi.getAll(token);

    if (encryptedCredentials.length === 0) {
      return null;
    }

    // Decrypt credentials
    const decrypted = decryptCredentials(
      encryptedCredentials.map((c) => ({
        id: c.id,
        provider: c.provider,
        name: c.name,
        encrypted_data: c.encrypted_data,
        iv: c.iv,
      }))
    );

    // Filter out credentials that failed to decrypt
    const validCredentials = decrypted.filter(c => c.api_key && !c.api_key.includes('[Decryption failed]'));

    if (validCredentials.length === 0) {
      console.warn('No valid credentials found (decryption may have failed)');
      return null;
    }

    // Convert to client format
    cachedCredentials = toClientCredentials(validCredentials);
    llmClient = new DirectLLMClient(cachedCredentials);

    return llmClient;
  } catch (error) {
    console.error('Failed to initialize LLM client:', error);
    return null;
  }
}

/**
 * Clear the LLM client cache (call on logout or lock)
 */
export function clearLLMClient(): void {
  llmClient = null;
  cachedCredentials = [];
}

/**
 * Get available models from all configured providers
 */
export async function getAvailableModels(token: string): Promise<{
  id: string;
  name: string;
  provider: string;
  credentialId: string;
}[]> {
  const client = await getLLMClient(token);

  if (!client) {
    return [];
  }

  try {
    const models = await client.listAllModels();
    return models.map(m => ({
      ...m,
      credentialId: m.id.split(':')[0],
    }));
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return [];
  }
}

/**
 * Convert app ChatMessage to LLM ChatMessage format
 */
function toAPIMessages(messages: ChatMessage[]): LLMMessage[] {
  return messages.map(msg => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: typeof msg.content === 'string'
      ? msg.content
      : msg.content.map(c =>
          c.type === 'text'
            ? { type: 'text' as const, text: c.text }
            : { type: 'image_url' as const, image_url: { url: c.image_url?.url || '' } }
        ),
  }));
}

/**
 * Stream a chat completion
 */
export async function* streamChat(
  token: string,
  modelId: string,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    signal?: AbortSignal;
  }
): AsyncGenerator<StreamUpdate> {
  const client = await getLLMClient(token);

  if (!client) {
    yield { done: true, value: '', error: 'No LLM client available. Please add a connection.' };
    return;
  }

  // Build message array
  const apiMessages = toAPIMessages(messages);

  // Add system prompt if provided
  if (options?.systemPrompt) {
    apiMessages.unshift({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  // Extract credential ID and model name from the modelId (format: credentialId:modelName)
  const [credentialId, ...modelParts] = modelId.split(':');
  const modelName = modelParts.join(':') || modelId;

  try {
    const generator = client.streamChatCompletion(
      {
        model: modelName,
        messages: apiMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        stream: true,
      },
      credentialId,
      options?.signal
    );

    for await (const update of generator) {
      yield update;
    }
  } catch (error) {
    yield {
      done: true,
      value: '',
      error: error instanceof Error ? error.message : 'Stream failed'
    };
  }
}

/**
 * Non-streaming chat completion
 */
export async function chatCompletion(
  token: string,
  modelId: string,
  messages: ChatMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<{ content: string; error?: string }> {
  const client = await getLLMClient(token);

  if (!client) {
    return { content: '', error: 'No LLM client available. Please add a connection.' };
  }

  const apiMessages = toAPIMessages(messages);

  if (options?.systemPrompt) {
    apiMessages.unshift({
      role: 'system',
      content: options.systemPrompt,
    });
  }

  const [credentialId, ...modelParts] = modelId.split(':');
  const modelName = modelParts.join(':') || modelId;

  try {
    const response = await client.chatCompletion(
      {
        model: modelName,
        messages: apiMessages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
      },
      credentialId
    );

    const content = response.choices[0]?.message?.content;
    return {
      content: typeof content === 'string' ? content : ''
    };
  } catch (error) {
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Chat completion failed'
    };
  }
}

/**
 * Check if any connections are configured
 */
export async function hasConnections(token: string): Promise<boolean> {
  try {
    const credentials = await credentialsApi.getAll(token);
    return credentials.length > 0;
  } catch {
    return false;
  }
}
