/**
 * Direct OpenAI API Client
 * Makes requests directly from the browser to OpenAI's API
 */

import type {
	LLMCredential,
	ChatCompletionOptions,
	ChatCompletionResponse,
	StreamUpdate
} from '../types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function debugLog(message: string, data?: unknown): void {
	if (import.meta.env.DEV) {
		if (data !== undefined) {
			console.log(message, data);
		} else {
			console.log(message);
		}
	}
}

function debugError(message: string, data?: unknown): void {
	if (import.meta.env.DEV) {
		if (data !== undefined) {
			console.error(message, data);
		} else {
			console.error(message);
		}
	}
}

/**
 * OpenAI Direct Client
 */
export class OpenAIDirectClient {
	private credential: LLMCredential;
	private baseUrl: string;

	constructor(credential: LLMCredential) {
		this.credential = credential;
		this.baseUrl = credential.baseUrl || DEFAULT_BASE_URL;
	}

	/**
	 * Get available models from OpenAI
	 */
	async listModels(): Promise<{ id: string; owned_by: string }[]> {
		const response = await fetch(`${this.baseUrl}/models`, {
			method: 'GET',
			headers: this.getHeaders()
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Failed to fetch models');
		}

		const data = await response.json();
		return data.data || [];
	}

	/**
	 * Non-streaming chat completion
	 */
	async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				...options,
				stream: false
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Chat completion failed');
		}

		return response.json();
	}

	/**
	 * Streaming chat completion
	 */
	async *streamChatCompletion(
		options: ChatCompletionOptions,
		signal?: AbortSignal
	): AsyncGenerator<StreamUpdate> {
		const requestBody = {
			...options,
			stream: true,
			stream_options: { include_usage: true }
		};
		
		debugLog('🔐 E2EE Direct LLM Request:', {
			url: `${this.baseUrl}/chat/completions`,
			model: options.model,
			messageCount: options.messages?.length
		});
		
		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify(requestBody),
			signal
		});

		if (!response.ok) {
			const errorText = await response.text();
			debugError('🔐 E2EE Direct LLM Error:', {
				status: response.status,
				statusText: response.statusText,
				error: errorText
			});
			try {
				const errorJson = JSON.parse(errorText);
				yield { done: true, value: '', error: errorJson.error?.message || 'Chat completion failed' };
			} catch {
				yield { done: true, value: '', error: `HTTP ${response.status}: ${errorText}` };
			}
			return;
		}

		if (!response.body) {
			yield { done: true, value: '', error: 'No response body' };
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || !trimmed.startsWith('data: ')) continue;

					const data = trimmed.slice(6);
					if (data === '[DONE]') {
						yield { done: true, value: '' };
						return;
					}

					try {
						const parsed = JSON.parse(data);

						if (parsed.usage) {
							yield { done: false, value: '', usage: parsed.usage };
							continue;
						}

						const content = parsed.choices?.[0]?.delta?.content || '';
						const reasoning_content = parsed.choices?.[0]?.delta?.reasoning_content;
						if (content || reasoning_content) {
							yield { done: false, value: content, reasoning_content };
						}

						if (parsed.choices?.[0]?.finish_reason) {
							yield { done: true, value: '' };
							return;
						}
					} catch (e) {
						debugError('Error parsing SSE event:', e);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		yield { done: true, value: '' };
	}

	/**
	 * Get request headers
	 */
	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.credential.apiKey}`
		};

		if (this.credential.orgId) {
			headers['OpenAI-Organization'] = this.credential.orgId;
		}

		return headers;
	}
}
