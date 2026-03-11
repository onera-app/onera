/**
 * ChatModelAdapter for assistant-ui LocalRuntime
 *
 * Bridges assistant-ui's runtime to the existing AI SDK streamText() transport.
 * Extracts the core streaming logic from DirectBrowserTransport.sendMessages()
 * into an async generator compatible with assistant-ui's ChatModelAdapter interface.
 */

import {
  streamText,
  convertToModelMessages,
  wrapLanguageModel,
  extractReasoningMiddleware,
  type UIMessage,
} from 'ai';
import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
  ThreadMessage,
  TextMessagePart,
  ReasoningMessagePart,
  ToolCallMessagePart,
  SourceMessagePart,
} from '@assistant-ui/react';
import type { NativeSearchSettings, NativeSearchProvider } from '@/stores/toolsStore';

import { useModelStore } from '@/stores/modelStore';
import { useModelParamsStore } from '@/stores/modelParamsStore';
import { useToolsStore } from '@/stores/toolsStore';
import { getEnclaveConfigCache } from '@/stores/attestationStore';
import { parseModelId, getCredentialById } from './credentials';
import { getModelForCredential, getPrivateInferenceModel } from './providers';
import { analytics } from '@/lib/analytics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatModelAdapterOptions {
  /**
   * Pre-flight billing check. Throws to abort the run.
   */
  checkAllowance?: () => Promise<void>;

  /**
   * Whether this run was triggered by a "regenerate" action.
   * Controls which analytics event to fire.
   */
  isRegenerate?: boolean;
}

// Assistant-ui content part union used for accumulation
type ContentPart =
  | TextMessagePart
  | ReasoningMessagePart
  | ToolCallMessagePart
  | SourceMessagePart;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert assistant-ui ThreadMessage[] to AI SDK UIMessage[] for
 * convertToModelMessages(). The two have different shapes:
 *   - assistant-ui: { role, content: ContentPart[] }
 *   - AI SDK:       { role, parts: UIPart[] }
 */
function threadMessagesToUIMessages(
  messages: readonly ThreadMessage[],
): UIMessage[] {
  return messages.map((msg) => {
    const uiParts: UIMessage['parts'] = [];

    for (const part of msg.content) {
      switch (part.type) {
        case 'text':
          uiParts.push({ type: 'text', text: part.text });
          break;
        case 'reasoning':
          uiParts.push({ type: 'reasoning', text: part.text, providerMetadata: {} });
          break;
        case 'image':
          uiParts.push({ type: 'file', mediaType: 'image/*', url: part.image });
          break;
        case 'tool-call':
          if (part.result !== undefined) {
            uiParts.push({
              type: 'dynamic-tool',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              state: 'output',
              input: part.args,
              output: part.result,
            } as unknown as UIMessage['parts'][number]);
          } else {
            uiParts.push({
              type: 'dynamic-tool',
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              state: 'input-available',
              input: part.args,
            } as unknown as UIMessage['parts'][number]);
          }
          break;
        case 'source':
          uiParts.push({
            type: 'source-url',
            sourceId: part.id,
            url: part.url,
            title: part.title,
          });
          break;
        // Skip other part types we don't need for model messages
      }
    }

    // Ensure at least one part so convertToModelMessages doesn't choke
    if (uiParts.length === 0) {
      uiParts.push({ type: 'text', text: '' });
    }

    return {
      id: msg.id,
      role: msg.role as UIMessage['role'],
      parts: uiParts,
    };
  });
}

/**
 * Build native search tools based on provider type.
 * Mirrors DirectBrowserTransport.buildNativeSearchTools().
 */
function buildNativeSearchTools(
  provider: string,
  nativeSearch?: { enabled: boolean; settings?: NativeSearchSettings },
): Record<string, unknown> | undefined {
  if (!nativeSearch?.enabled) {
    return undefined;
  }

  const settings = nativeSearch.settings;

  switch (provider) {
    case 'google':
      return {
        google_search: google.tools.googleSearch({}),
      };

    case 'xai':
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

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a ChatModelAdapter that wraps the existing streamText() transport.
 *
 * Usage:
 * ```ts
 * const adapter = createChatModelAdapter({
 *   checkAllowance: () => trpc.billing.checkInferenceAllowance.query(),
 * });
 * const runtime = useLocalRuntime(adapter);
 * ```
 */
export function createChatModelAdapter(
  options: ChatModelAdapterOptions = {},
): ChatModelAdapter {
  const { checkAllowance, isRegenerate } = options;

  return {
    async *run({ messages, abortSignal }: ChatModelRunOptions) {
      // ── 0. Pre-flight billing check ──────────────────────────────────
      if (checkAllowance) {
        await checkAllowance();
      }

      // ── 1. Resolve model + credentials from Zustand stores ───────────
      const selectedModelId = useModelStore.getState().selectedModelId;
      if (!selectedModelId) {
        throw new Error('No model selected');
      }

      const { credentialId, modelName, isPrivate } = parseModelId(selectedModelId);

      // Read store snapshots
      const { systemPrompt, providerSettings } = useModelParamsStore.getState();
      const { globalParams } = useModelParamsStore.getState();
      const maxTokens = globalParams.maxTokens ?? 4096;

      // Native search config
      const toolsState = useToolsStore.getState();

      // ── 2. Get model instance ────────────────────────────────────────
      let providerName = '';

      if (isPrivate) {
        // Private inference path
        const enclaveConfig = getEnclaveConfigCache();
        if (!enclaveConfig) {
          throw new Error('Enclave configuration required for private inference');
        }

        const privateModel = getPrivateInferenceModel({
          endpoint: enclaveConfig.endpoint,
          wsEndpoint: enclaveConfig.wsEndpoint,
          attestationEndpoint: enclaveConfig.attestationEndpoint,
          expectedMeasurements: enclaveConfig.expectedMeasurements,
          allowUnverified: enclaveConfig.allowUnverified,
          modelId: modelName,
        });

        providerName = 'private';

        // Convert messages
        const uiMessages = threadMessagesToUIMessages(messages);
        const modelMessages = await convertToModelMessages(uiMessages);

        // Fire analytics
        fireAnalytics(selectedModelId, isRegenerate);

        const result = streamText({
          model: privateModel,
          system: systemPrompt || undefined,
          messages: modelMessages,
          maxOutputTokens: maxTokens,
          abortSignal,
        } as unknown as Parameters<typeof streamText>[0]);

        // Stream chunks
        yield* streamResults(result, selectedModelId, providerName);
        return;
      }

      // ── Credential-based models ──────────────────────────────────────
      if (!credentialId) {
        throw new Error('No credential ID in model selection');
      }

      const credential = getCredentialById(credentialId);
      if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
      }

      providerName = credential.provider;

      // ── 3. Apply reasoning middleware for DeepSeek models ────────────
      const baseModel = getModelForCredential(credential, modelName);
      const usesThinkTags =
        credential.provider === 'deepseek' ||
        modelName.toLowerCase().includes('deepseek');

      const model = usesThinkTags
        ? wrapLanguageModel({
            model: baseModel as unknown as Parameters<typeof wrapLanguageModel>[0]['model'],
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          })
        : baseModel;

      // ── 4. Build native search tools ─────────────────────────────────
      const nativeSearchEnabled =
        toolsState.nativeSearchSettings[providerName as NativeSearchProvider]?.enabled ?? false;
      const nativeSearchSettings =
        toolsState.nativeSearchSettings[providerName as NativeSearchProvider];

      const tools = buildNativeSearchTools(providerName, {
        enabled: nativeSearchEnabled,
        settings: nativeSearchSettings,
      });

      // ── 5. Build provider-specific options ───────────────────────────
      const isOpenAIReasoningModel =
        credential.provider === 'openai' &&
        /\b(o1|o3|o4|gpt-5)(-mini|-preview)?\b/i.test(modelName);

      const openaiSettings = providerSettings?.openai;
      const anthropicSettings = providerSettings?.anthropic;

      const providerOptions: Record<string, unknown> = {};

      if (isOpenAIReasoningModel && openaiSettings) {
        providerOptions.openai = {
          reasoningSummary: openaiSettings.reasoningSummary,
          reasoningEffort: openaiSettings.reasoningEffort,
        };
      }

      if (credential.provider === 'anthropic' && anthropicSettings?.extendedThinking) {
        providerOptions.anthropic = {
          thinking: { type: 'enabled', budgetTokens: 10000 },
        };
      }

      // ── 6. Convert messages ──────────────────────────────────────────
      const uiMessages = threadMessagesToUIMessages(messages);
      const modelMessages = await convertToModelMessages(uiMessages);

      // ── 7. Fire analytics ────────────────────────────────────────────
      fireAnalytics(selectedModelId, isRegenerate);

      // ── 8. Call streamText() ─────────────────────────────────────────
      const streamOptions = {
        model,
        system: systemPrompt || undefined,
        messages: modelMessages,
        maxOutputTokens: maxTokens,
        abortSignal,
        ...(tools && { tools }),
        ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
      } as unknown as Parameters<typeof streamText>[0];

      const result = streamText(streamOptions);

      // ── 9. Stream chunks ─────────────────────────────────────────────
      yield* streamResults(result, selectedModelId, providerName);
    },
  };
}

// ---------------------------------------------------------------------------
// Stream processing
// ---------------------------------------------------------------------------

/**
 * Read fullStream from a streamText result and yield ChatModelRunResult
 * objects incrementally for assistant-ui.
 */
async function* streamResults(
  result: ReturnType<typeof streamText>,
  modelId: string,
  _providerName: string,
): AsyncGenerator<ChatModelRunResult, void> {
  const content: ContentPart[] = [];
  const sources: Array<{ id: string; url: string; title?: string }> = [];

  // Track tool input buffers for accumulating args text
  const toolInputBuffers = new Map<string, { toolName: string; argsText: string }>();

  for await (const chunk of result.fullStream) {
    switch (chunk.type) {
      // ── Text streaming ───────────────────────────────────────────
      case 'text-start': {
        content.push({ type: 'text', text: '' });
        break;
      }
      case 'text-delta': {
        // Find the last text part and append
        const textPart = findLastPart(content, 'text') as
          | { type: 'text'; text: string }
          | undefined;
        if (textPart) {
          // Mutable update for performance — we yield a new snapshot each time
          (textPart as { text: string }).text += chunk.text;
        }
        yield { content: [...content], status: { type: 'running' } };
        break;
      }
      case 'text-end': {
        break;
      }

      // ── Reasoning streaming ──────────────────────────────────────
      case 'reasoning-start': {
        content.push({ type: 'reasoning', text: '' });
        break;
      }
      case 'reasoning-delta': {
        const reasoningPart = findLastPart(content, 'reasoning') as
          | { type: 'reasoning'; text: string }
          | undefined;
        if (reasoningPart) {
          (reasoningPart as { text: string }).text += chunk.text;
        }
        yield { content: [...content], status: { type: 'running' } };
        break;
      }
      case 'reasoning-end': {
        break;
      }

      // ── Tool call streaming ──────────────────────────────────────
      case 'tool-input-start': {
        toolInputBuffers.set(chunk.id, {
          toolName: chunk.toolName,
          argsText: '',
        });
        break;
      }
      case 'tool-input-delta': {
        const buf = toolInputBuffers.get(chunk.id);
        if (buf) {
          buf.argsText += chunk.delta;
        }
        break;
      }
      case 'tool-call': {
        const buf = toolInputBuffers.get(chunk.toolCallId);
        content.push({
          type: 'tool-call',
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          args: chunk.input as Record<string, unknown>,
          argsText: buf?.argsText ?? JSON.stringify(chunk.input),
        } as ToolCallMessagePart);
        toolInputBuffers.delete(chunk.toolCallId);
        yield { content: [...content], status: { type: 'running' } };
        break;
      }
      case 'tool-result': {
        // Update the existing tool-call part with the result
        const toolPart = content.find(
          (p) =>
            p.type === 'tool-call' &&
            (p as ToolCallMessagePart).toolCallId === chunk.toolCallId,
        ) as ToolCallMessagePart | undefined;
        if (toolPart) {
          (toolPart as { result: unknown }).result = chunk.output;
        }
        yield { content: [...content], status: { type: 'running' } };
        break;
      }

      // ── Sources ──────────────────────────────────────────────────
      case 'source': {
        const source = chunk as unknown as {
          sourceType?: string;
          id?: string;
          sourceId?: string;
          url?: string;
          title?: string;
        };
        if (source.url) {
          const sourceId = source.id || source.sourceId || `source-${sources.length}`;
          sources.push({ id: sourceId, url: source.url, title: source.title });
          content.push({
            type: 'source',
            sourceType: 'url',
            id: sourceId,
            url: source.url,
            title: source.title,
          } as SourceMessagePart);
          yield { content: [...content], status: { type: 'running' } };
        }
        break;
      }

      // ── Stream lifecycle (ignored for yield, used for metadata) ──
      case 'start':
      case 'finish':
      case 'start-step':
      case 'finish-step':
      case 'error':
      case 'abort':
        break;

      default:
        // Ignore unknown chunk types (raw, file, etc.)
        break;
    }
  }

  // ── 10. Final yield with metadata ──────────────────────────────────
  yield {
    content: [...content],
    status: { type: 'complete', reason: 'stop' },
    metadata: {
      custom: {
        model: modelId,
        ...(sources.length > 0 ? { sources } : {}),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function findLastPart(
  content: ContentPart[],
  type: string,
): ContentPart | undefined {
  for (let i = content.length - 1; i >= 0; i--) {
    if (content[i].type === type) return content[i];
  }
  return undefined;
}

function fireAnalytics(modelId: string, isRegenerate?: boolean): void {
  if (isRegenerate) {
    analytics.chat.messageRegenerated({ model_id: modelId });
  } else {
    analytics.chat.messageSent({ model_id: modelId });
  }
}
