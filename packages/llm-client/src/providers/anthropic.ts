/**
 * Direct Anthropic API Client
 * Makes requests directly from the browser to Anthropic's API
 */

import type {
	LLMCredential,
	ChatCompletionOptions,
	ChatCompletionResponse,
	ChatMessage,
	StreamUpdate
} from '../types';

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

function debugError(message: string, data?: unknown): void {
	if (import.meta.env.DEV) {
		if (data !== undefined) {
			console.error(message, data);
		} else {
			console.error(message);
		}
	}
}

interface AnthropicMessage {
	role: 'user' | 'assistant';
	content: string | AnthropicContent[];
}

interface AnthropicContent {
	type: 'text' | 'image';
	text?: string;
	source?: {
		type: 'base64';
		media_type: string;
		data: string;
	};
}

interface AnthropicResponse {
	id: string;
	type: 'message';
	role: 'assistant';
	content: { type: 'text'; text: string }[];
	model: string;
	stop_reason: string | null;
	stop_sequence: string | null;
	usage: {
		input_tokens: number;
		output_tokens: number;
	};
}

interface AnthropicStreamEvent {
	type: string;
	index?: number;
	delta?: {
		type: string;
		text?: string;
		stop_reason?: string;
	};
	message?: AnthropicResponse;
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
	};
}

/**
 * Anthropic Direct Client
 */
export class AnthropicDirectClient {
	private credential: LLMCredential;
	private baseUrl: string;

	constructor(credential: LLMCredential) {
		this.credential = credential;
		this.baseUrl = credential.baseUrl || DEFAULT_BASE_URL;
	}

	/**
	 * Non-streaming chat completion
	 */
	async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
		const { systemMessage, messages } = this.convertMessages(options.messages);

		const response = await fetch(`${this.baseUrl}/v1/messages`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				model: options.model,
				max_tokens: options.max_tokens || 4096,
				messages,
				...(systemMessage && { system: systemMessage }),
				temperature: options.temperature,
				top_p: options.top_p,
				stop_sequences: options.stop ? (Array.isArray(options.stop) ? options.stop : [options.stop]) : undefined
			})
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error?.message || 'Anthropic chat completion failed');
		}

		const data: AnthropicResponse = await response.json();

		return {
			id: data.id,
			object: 'chat.completion',
			created: Math.floor(Date.now() / 1000),
			model: data.model,
			choices: [
				{
					index: 0,
					message: {
						role: 'assistant',
						content: data.content.map((c) => c.text).join('')
					},
					finish_reason: data.stop_reason || 'stop'
				}
			],
			usage: {
				prompt_tokens: data.usage.input_tokens,
				completion_tokens: data.usage.output_tokens,
				total_tokens: data.usage.input_tokens + data.usage.output_tokens
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
		const { systemMessage, messages } = this.convertMessages(options.messages);

		const response = await fetch(`${this.baseUrl}/v1/messages`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				model: options.model,
				max_tokens: options.max_tokens || 4096,
				messages,
				...(systemMessage && { system: systemMessage }),
				temperature: options.temperature,
				top_p: options.top_p,
				stop_sequences: options.stop ? (Array.isArray(options.stop) ? options.stop : [options.stop]) : undefined,
				stream: true
			}),
			signal
		});

		if (!response.ok) {
			const error = await response.json();
			yield { done: true, value: '', error: error.error?.message || 'Anthropic chat completion failed' };
			return;
		}

		if (!response.body) {
			yield { done: true, value: '', error: 'No response body' };
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let inputTokens = 0;
		let outputTokens = 0;

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
						const event: AnthropicStreamEvent = JSON.parse(data);

						switch (event.type) {
							case 'message_start':
								if (event.message?.usage) {
									inputTokens = event.message.usage.input_tokens;
								}
								break;

							case 'content_block_delta':
								if (event.delta?.text) {
									yield { done: false, value: event.delta.text };
								}
								break;

							case 'message_delta':
								if (event.usage?.output_tokens) {
									outputTokens = event.usage.output_tokens;
								}
								if (event.delta?.stop_reason) {
									yield {
										done: true,
										value: '',
										usage: {
											prompt_tokens: inputTokens,
											completion_tokens: outputTokens,
											total_tokens: inputTokens + outputTokens
										}
									};
									return;
								}
								break;
						}
					} catch (e) {
						debugError('Error parsing Anthropic SSE event:', e);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		yield { done: true, value: '' };
	}

	/**
	 * Convert OpenAI-format messages to Anthropic format
	 */
	private convertMessages(messages: ChatMessage[]): {
		systemMessage: string | null;
		messages: AnthropicMessage[];
	} {
		let systemMessage: string | null = null;
		const anthropicMessages: AnthropicMessage[] = [];

		for (const msg of messages) {
			if (msg.role === 'system') {
				systemMessage = typeof msg.content === 'string' 
					? msg.content 
					: msg.content.map(c => c.type === 'text' ? c.text : '').join('');
				continue;
			}

			if (msg.role === 'tool') {
				anthropicMessages.push({
					role: 'user',
					content: `Tool response: ${typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}`
				});
				continue;
			}

			if (typeof msg.content === 'string') {
				anthropicMessages.push({
					role: msg.role as 'user' | 'assistant',
					content: msg.content
				});
			} else {
				const content: AnthropicContent[] = msg.content.map((part) => {
					if (part.type === 'text') {
						return { type: 'text' as const, text: part.text };
					} else if (part.type === 'image_url' && part.image_url?.url) {
						const match = part.image_url.url.match(/^data:(image\/\w+);base64,(.+)$/);
						if (match) {
							return {
								type: 'image' as const,
								source: {
									type: 'base64' as const,
									media_type: match[1],
									data: match[2]
								}
							};
						}
					}
					return { type: 'text' as const, text: '' };
				});

				anthropicMessages.push({
					role: msg.role as 'user' | 'assistant',
					content
				});
			}
		}

		return { systemMessage, messages: anthropicMessages };
	}

	/**
	 * List available Anthropic models
	 * Anthropic doesn't have a models API, so we return a static list
	 */
	async listModels(): Promise<{ id: string; name: string }[]> {
		// Static list of current Anthropic models
		return [
			{ id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
			{ id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
			{ id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
			{ id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
			{ id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
			{ id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
			{ id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
			{ id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
		];
	}

	/**
	 * Get request headers
	 */
	private getHeaders(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
			'x-api-key': this.credential.apiKey,
			'anthropic-version': API_VERSION,
			'anthropic-dangerous-direct-browser-access': 'true'
		};
	}
}
