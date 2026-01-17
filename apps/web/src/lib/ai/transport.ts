/**
 * Direct Browser Transport for AI SDK
 * Enables direct browser-to-provider communication for E2EE compliance
 */

import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
  type UIMessage,
  type UIMessageChunk,
  type ModelMessage,
} from 'ai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { getModelForCredential } from './providers';
import { getCredentialById, parseModelId } from './credentials';
import type { NativeSearchSettings, NativeSearchProvider } from '@/stores/toolsStore';

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

  /**
   * Native search settings for supported providers (Google, xAI)
   */
  nativeSearch?: {
    enabled: boolean;
    settings?: NativeSearchSettings;
  };
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
    const { modelId, temperature, maxTokens, systemPrompt, nativeSearch } = this.options;

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
    const baseModel = getModelForCredential(credential, modelName);

    // Wrap with reasoning middleware to extract <think>/<thinking>/<reason>/<reasoning> tags
    // This enables proper handling of reasoning models like DeepSeek R1, Claude, etc.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = wrapLanguageModel({
      model: baseModel as any,
      middleware: extractReasoningMiddleware({
        tagName: 'think',
      }),
    });

    // Convert UIMessages to ModelMessages for streamText
    const modelMessages = this.convertToModelMessages(messages);

    // Build tools object based on provider and native search settings
    const tools = this.buildNativeSearchTools(credential.provider, nativeSearch);

    // Call streamText directly in the browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText({
      model: model as any,
      system: systemPrompt,
      messages: modelMessages,
      temperature: temperature ?? 0.7,
      maxOutputTokens: maxTokens ?? 4096,
      abortSignal,
      ...(tools && { tools }),
    });

    // Convert to UIMessageStream and return as ReadableStream
    // toUIMessageStream returns an AsyncIterableStream which extends ReadableStream
    return result.toUIMessageStream() as unknown as ReadableStream<UIMessageChunk>;
  }

  /**
   * Build native search tools based on provider type
   * Returns tools object compatible with streamText
   */
  private buildNativeSearchTools(
    provider: string,
    nativeSearch?: { enabled: boolean; settings?: NativeSearchSettings }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> | undefined {
    if (!nativeSearch?.enabled) {
      return undefined;
    }

    const settings = nativeSearch.settings;

    switch (provider) {
      case 'google':
        // Google Gemini native search grounding
        return {
          google_search: google.tools.googleSearch({}),
        };

      case 'xai':
        // xAI Grok native web search
        return {
          web_search: xai.tools.webSearch({
            allowedDomains: settings?.allowedDomains,
            enableImageUnderstanding: settings?.enableImageUnderstanding ?? true,
          }),
        };

      default:
        return undefined;
    }
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
   * Handles multimodal content (text + images/files)
   */
  private convertToModelMessages(messages: UIMessage[]): ModelMessage[] {
    return messages.map((msg) => {
      // Check if message has multimodal content (images or files)
      // Cast to any for type checking since UIMessage parts may include custom types
      const hasMultimodal = msg.parts?.some((part) => {
        const p = part as any;
        return (
          p.type === 'image' ||
          p.type === 'image_url' ||
          (p.type === 'file' && p.mediaType?.startsWith('image/'))
        );
      });

      if (hasMultimodal) {
        // Build multimodal content array
        const content: Array<{ type: string; text?: string; image?: string }> = [];

        if (msg.parts) {
          for (const part of msg.parts) {
            const p = part as any;
            if (part.type === 'text') {
              content.push({ type: 'text', text: part.text });
            } else if (p.type === 'image' || p.type === 'image_url') {
              // Handle legacy formats
              const imageData = p.image || p.image_url?.url;
              if (imageData) {
                content.push({ type: 'image', image: imageData });
              }
            } else if (p.type === 'file' && p.mediaType?.startsWith('image/')) {
              // Handle AI SDK file format for images
              if (p.url) {
                content.push({ type: 'image', image: p.url });
              }
            }
          }
        }

        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content,
        } as ModelMessage;
      }

      // Text-only message
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

/**
 * Check if a provider supports native search
 */
export function supportsNativeSearch(provider: string): provider is NativeSearchProvider {
  return provider === 'google' || provider === 'xai';
}

/**
 * Get the current provider from a model ID
 */
export function getProviderFromModelId(modelId: string): string | null {
  const { credentialId } = parseModelId(modelId);
  if (!credentialId) return null;

  const credential = getCredentialById(credentialId);
  return credential?.provider || null;
}
