/**
 * Direct Browser Transport for AI SDK
 * Enables direct browser-to-provider communication for E2EE compliance
 */

import {
  streamText,
  convertToModelMessages,
  wrapLanguageModel,
  extractReasoningMiddleware,
  type UIMessage,
  type UIMessageChunk,
} from 'ai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { getModelForCredential, getPrivateInferenceModel } from './providers';
import { getCredentialById, parseModelId } from './credentials';
import type { NativeSearchSettings, NativeSearchProvider } from '@/stores/toolsStore';
import type { ProviderSettings } from '@/stores/modelParamsStore';
import type { EnclaveEndpoint } from '@onera/types';

/**
 * Enclave configuration for private inference
 */
export interface EnclaveConfig {
  endpoint: EnclaveEndpoint;
  wsEndpoint: string;
  attestationEndpoint: string;
  expectedMeasurements?: { launch_digest: string };
}

/**
 * Options for DirectBrowserTransport
 */
export interface DirectBrowserTransportOptions {
  /**
   * Selected model ID in format: credentialId:modelName or private:modelId
   */
  modelId: string;

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

  /**
   * Provider-specific settings (reasoning, extended thinking, etc.)
   */
  providerSettings?: ProviderSettings;

  /**
   * Enclave configuration for private inference (set when using private models)
   */
  enclaveConfig?: EnclaveConfig;
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
    const { modelId, maxTokens, systemPrompt, nativeSearch, providerSettings, enclaveConfig } = this.options;

    // Parse the model ID to get credential and model name
    const { credentialId, modelName, isPrivate } = parseModelId(modelId);

    // Handle private inference models
    if (isPrivate) {
      if (!enclaveConfig) {
        throw new Error('Enclave configuration required for private inference');
      }

      // Use private inference provider
      const privateModel = getPrivateInferenceModel({
        endpoint: enclaveConfig.endpoint,
        wsEndpoint: enclaveConfig.wsEndpoint,
        attestationEndpoint: enclaveConfig.attestationEndpoint,
        expectedMeasurements: enclaveConfig.expectedMeasurements,
      });

      // Convert UIMessages to ModelMessages
      const modelMessages = await convertToModelMessages(messages);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = streamText({
        model: privateModel as any,
        system: systemPrompt,
        messages: modelMessages,
        maxOutputTokens: maxTokens ?? 4096,
        abortSignal,
      });

      return result.toUIMessageStream({
        sendReasoning: true,
      }) as unknown as ReadableStream<UIMessageChunk>;
    }

    // Handle credential-based models
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

    // Only wrap with reasoning middleware for models that use <think> tags (DeepSeek R1, etc.)
    // OpenAI reasoning models (o1, o3, gpt-5) use native Responses API which handles reasoning automatically
    const usesThinkTags = credential.provider === 'deepseek' || modelName.toLowerCase().includes('deepseek');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = usesThinkTags
      ? wrapLanguageModel({
          model: baseModel as any,
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        })
      : baseModel;

    // Convert UIMessages to ModelMessages using AI SDK utility
    const modelMessages = await convertToModelMessages(messages);

    // Build tools object based on provider and native search settings
    const tools = this.buildNativeSearchTools(credential.provider, nativeSearch);

    // Check if this is an OpenAI reasoning model
    const isOpenAIReasoningModel = credential.provider === 'openai' &&
      /\b(o1|o3|o4|gpt-5)(-mini|-preview)?\b/i.test(modelName);

    // Build provider-specific options
    const openaiSettings = providerSettings?.openai;
    const anthropicSettings = providerSettings?.anthropic;

    // Call streamText directly in the browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = streamText({
      model: model as any,
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: maxTokens ?? 4096,
      abortSignal,
      ...(tools && { tools }),
      // Enable reasoning for OpenAI reasoning models
      ...(isOpenAIReasoningModel && openaiSettings && {
        providerOptions: {
          openai: {
            reasoningSummary: openaiSettings.reasoningSummary,
            reasoningEffort: openaiSettings.reasoningEffort,
          },
        },
      }),
      // Enable extended thinking for Anthropic models
      ...(credential.provider === 'anthropic' && anthropicSettings?.extendedThinking && {
        providerOptions: {
          anthropic: {
            thinking: { type: 'enabled', budgetTokens: 10000 },
          },
        },
      }),
    });

    // Convert to UIMessageStream and return as ReadableStream
    // sendReasoning: true forwards reasoning tokens to the client
    return result.toUIMessageStream({
      sendReasoning: true,
    }) as unknown as ReadableStream<UIMessageChunk>;
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
