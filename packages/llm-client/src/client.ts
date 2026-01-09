/**
 * Unified Direct LLM Client
 * Connects directly to LLM providers from the browser
 */

import type {
	LLMCredential,
	EncryptedCredential,
	ChatCompletionOptions,
	ChatCompletionResponse,
	StreamUpdate
} from './types';
import { OpenAIDirectClient } from './providers/openai';
import { OllamaDirectClient } from './providers/ollama';
import { AnthropicDirectClient } from './providers/anthropic';
import { decryptCredentials as sodiumDecryptCredentials, isUnlocked } from '@cortex/crypto';

let credentialsCache: LLMCredential[] | null = null;

/**
 * Direct LLM Client
 */
export class DirectLLMClient {
	private credentials: LLMCredential[];
	private clients: Map<string, OpenAIDirectClient | OllamaDirectClient | AnthropicDirectClient> = new Map();

	constructor(credentials: LLMCredential[]) {
		this.credentials = credentials;
		this.initializeClients();
	}

	private initializeClients(): void {
		for (const cred of this.credentials) {
			let client: OpenAIDirectClient | OllamaDirectClient | AnthropicDirectClient;

			switch (cred.provider) {
				case 'openai':
				case 'azure':
				case 'custom':
					client = new OpenAIDirectClient(cred);
					break;
				case 'ollama':
					client = new OllamaDirectClient(cred);
					break;
				case 'anthropic':
					client = new AnthropicDirectClient(cred);
					break;
				default:
					client = new OpenAIDirectClient(cred);
			}

			this.clients.set(cred.id, client);
		}
	}

	getCredential(id: string): LLMCredential | undefined {
		return this.credentials.find((c) => c.id === id);
	}

	getCredentialForModel(modelId: string): LLMCredential | undefined {
		const [prefix, ...rest] = modelId.split(':');
		if (rest.length > 0) {
			return this.credentials.find((c) => c.id === prefix || c.provider === prefix);
		}
		return this.credentials[0];
	}

	private getClient(credentialId: string): OpenAIDirectClient | OllamaDirectClient | AnthropicDirectClient {
		const client = this.clients.get(credentialId);
		if (!client) {
			throw new Error(`No client found for credential: ${credentialId}`);
		}
		return client;
	}

	async chatCompletion(
		options: ChatCompletionOptions,
		credentialId?: string
	): Promise<ChatCompletionResponse> {
		const credential = credentialId
			? this.getCredential(credentialId)
			: this.getCredentialForModel(options.model);

		if (!credential) {
			throw new Error('No credential available for this model');
		}

		const client = this.getClient(credential.id);
		return client.chatCompletion(options);
	}

	async *streamChatCompletion(
		options: ChatCompletionOptions,
		credentialId?: string,
		signal?: AbortSignal
	): AsyncGenerator<StreamUpdate> {
		const credential = credentialId
			? this.getCredential(credentialId)
			: this.getCredentialForModel(options.model);

		if (!credential) {
			yield { done: true, value: '', error: 'No credential available for this model' };
			return;
		}

		const client = this.getClient(credential.id);
		yield* client.streamChatCompletion(options, signal);
	}

	async listAllModels(): Promise<{ id: string; name: string; provider: string }[]> {
		const allModels: { id: string; name: string; provider: string }[] = [];

		for (const credential of this.credentials) {
			try {
				const client = this.getClient(credential.id);

				if (client instanceof OpenAIDirectClient) {
					const models = await client.listModels();
					// Filter to only chat-capable models
					const chatModels = models.filter(m =>
						m.id.includes('gpt') ||
						m.id.includes('o1') ||
						m.id.includes('o3') ||
						m.id.includes('chatgpt')
					);
					for (const model of chatModels) {
						allModels.push({
							id: `${credential.id}:${model.id}`,
							name: model.id,
							provider: credential.name
						});
					}
				} else if (client instanceof OllamaDirectClient) {
					const models = await client.listModels();
					for (const model of models) {
						allModels.push({
							id: `${credential.id}:${model.name}`,
							name: model.name,
							provider: credential.name
						});
					}
				} else if (client instanceof AnthropicDirectClient) {
					const models = await client.listModels();
					for (const model of models) {
						allModels.push({
							id: `${credential.id}:${model.id}`,
							name: model.name,
							provider: credential.name
						});
					}
				}
			} catch (error) {
				console.error(`Failed to fetch models from ${credential.name}:`, error);
			}
		}

		return allModels;
	}
}

/**
 * Decrypt encrypted credentials
 */
export async function decryptCredentials(
	encryptedCredentials: EncryptedCredential[]
): Promise<LLMCredential[]> {
	if (!isUnlocked()) {
		throw new Error('E2EE not unlocked');
	}

	const encryptedArray = encryptedCredentials.map((enc) => ({
		id: enc.id,
		provider: enc.provider,
		name: enc.name,
		encrypted_data: enc.encrypted_data,
		iv: enc.iv
	}));

	return sodiumDecryptCredentials(encryptedArray) as unknown as LLMCredential[];
}

/**
 * Get or create the direct LLM client
 */
export async function getDirectLLMClient(
	encryptedCredentials: EncryptedCredential[]
): Promise<DirectLLMClient> {
	if (credentialsCache) {
		return new DirectLLMClient(credentialsCache);
	}

	const credentials = await decryptCredentials(encryptedCredentials);
	credentialsCache = credentials;

	return new DirectLLMClient(credentials);
}

/**
 * Clear the credentials cache (on lock or logout)
 */
export function clearCredentialsCache(): void {
	if (credentialsCache) {
		for (const credential of credentialsCache) {
			credential.apiKey = '';
			if (credential.orgId) {
				credential.orgId = '';
			}
		}
	}
	credentialsCache = null;
}
