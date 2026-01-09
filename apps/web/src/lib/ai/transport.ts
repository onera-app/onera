/**
 * Direct Browser Transport for AI SDK
 * Enables direct browser-to-provider communication for E2EE compliance
 */

import { streamText, type UIMessage, type UIMessageChunk, type ModelMessage } from 'ai';
import { getModelForCredential } from './providers';
import { getCredentialById, parseModelId } from './credentials';

/**
 * Options for DirectBrowserTransport
 */
export interface DirectBrowserTransportOptions {
  /**
   * Selected model ID in format: credentialId:modelName
   */
  modelId: string;

  /**
   * Optional temperature setting
   */
  temperature?: number;

  /**
   * Optional max tokens setting
   */
  maxTokens?: number;

  /**
   * Optional system prompt
   */
  systemPrompt?: string;
}

/**
 * Transport that makes direct API calls from the browser to LLM providers.
 * This preserves E2EE by ensuring API keys never leave the browser.
 */
export class DirectBrowserTransport {
  private options: DirectBrowserTransportOptions;

  constructor(options: DirectBrowserTransportOptions) {
    this.options = options;
  }

  /**
   * Update the model ID (for switching models)
   */
  setModelId(modelId: string): void {
    this.options.modelId = modelId;
  }

  /**
   * Update options
   */
  setOptions(options: Partial<DirectBrowserTransportOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Send messages to the LLM and return a streaming response
   */
  async sendMessages(options: {
    trigger: 'submit-message' | 'regenerate-message';
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
  }): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, abortSignal } = options;
    const { modelId, temperature, maxTokens, systemPrompt } = this.options;

    // Parse the model ID to get credential and model name
    const { credentialId, modelName } = parseModelId(modelId);

    if (!credentialId) {
      throw new Error('No credential ID in model selection');
    }

    // Get the credential from cache
    const credential = getCredentialById(credentialId);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialId}`);
    }

    // Get the AI SDK model instance
    const model = getModelForCredential(credential, modelName);

    // Convert UIMessages to ModelMessages for streamText
    const modelMessages = this.convertToModelMessages(messages);

    // Call streamText directly in the browser
    const result = streamText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 4096,
      abortSignal,
    });

    // Convert to UIMessageStream and return as ReadableStream
    // toUIMessageStream returns an AsyncIterableStream which extends ReadableStream
    return result.toUIMessageStream() as unknown as ReadableStream<UIMessageChunk>;
  }

  /**
   * Reconnect to an existing stream.
   * Not supported for direct browser transport since there's no server-side state.
   */
  async reconnectToStream(_options: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    // Direct browser transport doesn't support reconnection
    return null;
  }

  /**
   * Convert UI messages to model messages format for streamText
   */
  private convertToModelMessages(messages: UIMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      // Extract text content from message parts
      let textContent = '';

      if (msg.parts) {
        for (const part of msg.parts) {
          if (part.type === 'text') {
            textContent += part.text;
          }
        }
      }

      return {
        role: msg.role as 'user' | 'assistant' | 'system',
        content: textContent,
      };
    });
  }
}

/**
 * Create a DirectBrowserTransport instance
 */
export function createDirectBrowserTransport(
  options: DirectBrowserTransportOptions
): DirectBrowserTransport {
  return new DirectBrowserTransport(options);
}
