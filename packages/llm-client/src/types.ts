/**
 * LLM Types for Direct Client Connections
 */

export interface LLMCredential {
	id: string;
	provider: 'openai' | 'ollama' | 'anthropic' | 'azure' | 'custom';
	name: string;
	apiKey: string;
	baseUrl: string;
	orgId?: string;
	config?: Record<string, unknown>;
}

export interface EncryptedCredential {
	id: string;
	provider: string;
	name: string;
	encrypted_data: string;
	iv: string;
	salt?: string;
	created_at?: number;
	updated_at?: number;
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | MessageContent[];
	name?: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
}

export interface MessageContent {
	type: 'text' | 'image_url';
	text?: string;
	image_url?: {
		url: string;
		detail?: 'auto' | 'low' | 'high';
	};
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface ChatCompletionOptions {
	model: string;
	messages: ChatMessage[];
	temperature?: number;
	top_p?: number;
	max_tokens?: number;
	stream?: boolean;
	stop?: string | string[];
	presence_penalty?: number;
	frequency_penalty?: number;
	tools?: Tool[];
	tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface Tool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface ChatCompletionChunk {
	id: string;
	object: 'chat.completion.chunk';
	created: number;
	model: string;
	choices: {
		index: number;
		delta: {
			role?: string;
			content?: string;
			tool_calls?: ToolCall[];
		};
		finish_reason: string | null;
	}[];
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface ChatCompletionResponse {
	id: string;
	object: 'chat.completion';
	created: number;
	model: string;
	choices: {
		index: number;
		message: ChatMessage;
		finish_reason: string;
	}[];
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export interface StreamUpdate {
	done: boolean;
	value: string;
	error?: string;
	reasoning_content?: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}
