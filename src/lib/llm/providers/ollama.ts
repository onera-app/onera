/**
 * Direct Ollama API Client
 * Makes requests directly from the browser to Ollama
 */

import type {
	LLMCredential,
	ChatCompletionOptions,
	ChatCompletionResponse,
	ChatMessage,
	StreamUpdate
} from '../types';

const DEFAULT_BASE_URL = 'http://localhost:11434';

function debugError(message: string, data?: unknown): void {
	if (import.meta.env.DEV) {
		if (data !== undefined) {
			console.error(message, data);
		} else {
			console.error(message);
		}
	}
}

interface OllamaMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
	images?: string[];
}

interface OllamaGenerateResponse {
	model: string;
	created_at: string;
	message: OllamaMessage;
	done: boolean;
	done_reason?: string;
	total_duration?: number;
	load_duration?: number;
	prompt_eval_count?: number;
	prompt_eval_duration?: number;
	eval_count?: number;
	eval_duration?: number;
}

/**
 * Ollama Direct Client
 */
export class OllamaDirectClient {
	private credential: LLMCredential;
	private baseUrl: string;

	constructor(credential: LLMCredential) {
		this.credential = credential;
		this.baseUrl = credential.baseUrl || DEFAULT_BASE_URL;
	}

	/**
	 * Get available models from Ollama
	 */
	async listModels(): Promise<{ name: string; size: number; digest: string }[]> {
		const response = await fetch(`${this.baseUrl}/api/tags`, {
			method: 'GET',
			headers: this.getHeaders()
		});

		if (!response.ok) {
			throw new Error('Failed to fetch Ollama models');
		}

		const data = await response.json();
		return data.models || [];
	}

	/**
	 * Non-streaming chat completion
	 */
	async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
		const ollamaMessages = this.convertMessages(options.messages);

		const response = await fetch(`${this.baseUrl}/api/chat`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				model: options.model,
				messages: ollamaMessages,
				stream: false,
				options: {
					temperature: options.temperature,
					top_p: options.top_p,
					num_predict: options.max_tokens,
					stop: options.stop
				}
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Ollama chat completion failed');
		}

		const data: OllamaGenerateResponse = await response.json();

		return {
			id: `ollama-${Date.now()}`,
			object: 'chat.completion',
			created: Math.floor(Date.now() / 1000),
			model: data.model,
			choices: [
				{
					index: 0,
					message: {
						role: 'assistant',
						content: data.message.content
					},
					finish_reason: data.done_reason || 'stop'
				}
			],
			usage: {
				prompt_tokens: data.prompt_eval_count || 0,
				completion_tokens: data.eval_count || 0,
				total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
			}
		};
	}

	/**
	 * Streaming chat completion
	 */
	async *streamChatCompletion(
		options: ChatCompletionOptions,
		signal?: AbortSignal
	): AsyncGenerator<StreamUpdate> {
		const ollamaMessages = this.convertMessages(options.messages);

		const response = await fetch(`${this.baseUrl}/api/chat`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				model: options.model,
				messages: ollamaMessages,
				stream: true,
				options: {
					temperature: options.temperature,
					top_p: options.top_p,
					num_predict: options.max_tokens,
					stop: options.stop
				}
			}),
			signal
		});

		if (!response.ok) {
			const error = await response.json();
			yield { done: true, value: '', error: error.error || 'Ollama chat completion failed' };
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
					if (!trimmed) continue;

					try {
						const parsed: OllamaGenerateResponse = JSON.parse(trimmed);

						if (parsed.message?.content) {
							yield { done: false, value: parsed.message.content };
						}

						if (parsed.done) {
							yield {
								done: true,
								value: '',
								usage: {
									prompt_tokens: parsed.prompt_eval_count || 0,
									completion_tokens: parsed.eval_count || 0,
									total_tokens: (parsed.prompt_eval_count || 0) + (parsed.eval_count || 0)
								}
							};
							return;
						}
					} catch (e) {
						debugError('Error parsing Ollama response:', e);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		yield { done: true, value: '' };
	}

	/**
	 * Convert OpenAI-format messages to Ollama format
	 */
	private convertMessages(messages: ChatMessage[]): OllamaMessage[] {
		return messages.map((msg) => {
			const content = typeof msg.content === 'string' 
				? msg.content 
				: msg.content.map(c => c.type === 'text' ? c.text : '').join('');

			const images: string[] = [];
			if (typeof msg.content !== 'string') {
				for (const part of msg.content) {
					if (part.type === 'image_url' && part.image_url?.url) {
						const match = part.image_url.url.match(/^data:image\/\w+;base64,(.+)$/);
						if (match) {
							images.push(match[1]);
						}
					}
				}
			}

			return {
				role: msg.role === 'tool' ? 'assistant' : msg.role,
				content,
				...(images.length > 0 && { images })
			} as OllamaMessage;
		});
	}

	/**
	 * Get request headers
	 */
	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (this.credential.apiKey) {
			headers['Authorization'] = `Bearer ${this.credential.apiKey}`;
		}

		return headers;
	}
}
