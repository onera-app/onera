/**
 * LLM Module - Main Entry Point
 */

export type {
	LLMCredential,
	EncryptedCredential,
	ChatMessage,
	MessageContent,
	ToolCall,
	ChatCompletionOptions,
	Tool,
	ChatCompletionChunk,
	ChatCompletionResponse,
	StreamUpdate
} from './types';

export {
	DirectLLMClient,
	decryptCredentials,
	getDirectLLMClient,
	clearCredentialsCache
} from './client';

export { OpenAIDirectClient } from './providers/openai';
export { OllamaDirectClient } from './providers/ollama';
export { AnthropicDirectClient } from './providers/anthropic';
