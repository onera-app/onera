/**
 * Private Inference AI Provider
 *
 * Creates a Vercel AI SDK-compatible language model that communicates
 * with a TEE (Trusted Execution Environment) via Noise protocol.
 *
 * This provider:
 * - Verifies TEE attestation before establishing connection
 * - Encrypts all communication using Noise Protocol NK pattern
 * - Ensures end-to-end privacy for AI inference
 */

import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  LanguageModelV3StreamPart,
} from '@ai-sdk/provider';
import { NoiseWebSocketSession } from '@onera/crypto/noise';
import {
  fetchAndVerifyAttestation,
  type KnownMeasurements,
  type VerificationOptions,
} from '@onera/crypto/attestation';
import type { EnclaveEndpoint } from '@onera/types';

interface PrivateInferenceConfig {
  endpoint: EnclaveEndpoint;
  wsEndpoint: string;
  attestationEndpoint: string;
  expectedMeasurements?: KnownMeasurements;
  /**
   * The model ID to use for inference (e.g., 'qwen2.5-7b-instruct-q4_k_m.gguf')
   */
  modelId?: string;
  /**
   * Allow unverified attestation (development only).
   * WARNING: Setting this to true bypasses signature verification.
   * This should NEVER be true in production.
   */
  allowUnverified?: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Convert AI SDK v3 prompt format to simple ChatMessage array.
 * The AI SDK prompt is an array of message parts that can include
 * text, images, tool calls, etc. We extract just the text content.
 */
function convertPromptToMessages(prompt: unknown): ChatMessage[] {
  if (!Array.isArray(prompt)) {
    return [];
  }

  const messages: ChatMessage[] = [];

  for (const part of prompt) {
    if (typeof part !== 'object' || part === null) continue;

    const p = part as Record<string, unknown>;
    const role = p.role as string;

    // Handle different content formats
    let content = '';
    if (typeof p.content === 'string') {
      content = p.content;
    } else if (Array.isArray(p.content)) {
      // Content can be an array of parts (text, image, etc.)
      content = p.content
        .filter((c: unknown) => typeof c === 'object' && c !== null && (c as Record<string, unknown>).type === 'text')
        .map((c: unknown) => (c as Record<string, unknown>).text as string)
        .join('');
    }

    if (role && content) {
      messages.push({
        role: role as 'system' | 'user' | 'assistant',
        content,
      });
    }
  }

  return messages;
}

// Generate unique IDs for stream parts
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Creates a Vercel AI SDK v6-compatible language model that communicates
 * with a TEE via Noise protocol.
 */
export function createPrivateInferenceModel(
  config: PrivateInferenceConfig
): LanguageModelV3 {
  let verified = false;
  let attestedPublicKey: string | null = null;

  /**
   * Ensure attestation is verified and return the server's public key.
   * Attestation is cached across requests since the server key doesn't
   * change between restarts.
   */
  const ensureAttestation = async (): Promise<string> => {
    if (!verified || !attestedPublicKey) {
      const verificationOptions: VerificationOptions = {
        knownMeasurements: config.expectedMeasurements,
        allowUnverified: config.allowUnverified ?? false,
      };

      const result = await fetchAndVerifyAttestation(
        config.attestationEndpoint,
        verificationOptions
      );

      if (!result.valid) {
        throw new Error(`Attestation verification failed: ${result.error}`);
      }

      // Use the public key from the attestation result, NOT the pre-configured one
      // The server generates a new keypair on each restart, so we must use the fresh key
      attestedPublicKey = result.quote!.public_key;
      verified = true;

      // Note: attestation store is populated by useEnclaveSession's eager verification.
      // This lazy path only caches the public key for Noise handshakes.
    }

    return attestedPublicKey;
  };

  /**
   * Create a fresh WebSocket session for a single request.
   * Each request gets its own session to prevent stale messages from
   * previous requests (especially interrupted streams) from contaminating
   * subsequent requests.
   */
  const createSession = async (): Promise<NoiseWebSocketSession> => {
    const publicKey = await ensureAttestation();
    return NoiseWebSocketSession.connect(config.wsEndpoint, publicKey);
  };

  return {
    specificationVersion: 'v3',
    provider: 'onera-private',
    modelId: config.endpoint.id,

    // No URL pattern support - all data goes through encrypted channel
    supportedUrls: {},

    async doGenerate(
      options: LanguageModelV3CallOptions
    ): Promise<LanguageModelV3GenerateResult> {
      const sess = await createSession();

      try {
        // Convert AI SDK prompt format to server's expected format
        const messages = convertPromptToMessages(options.prompt);

        const request = {
          model: config.modelId,
          messages,
          stream: false,
          temperature: options.temperature,
          max_tokens: options.maxOutputTokens,
        };

        const requestBytes = new TextEncoder().encode(JSON.stringify(request));
        const responseBytes = await sess.sendAndReceive(requestBytes);
        const response = JSON.parse(new TextDecoder().decode(responseBytes));

        return {
          content: [
            {
              type: 'text',
              text: response.content || '',
            },
          ],
          finishReason: {
            unified: response.finishReason || 'stop',
            raw: response.rawFinishReason,
          },
          usage: {
            inputTokens: {
              total: response.usage?.promptTokens || 0,
              noCache: response.usage?.promptTokens || 0,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: response.usage?.completionTokens || 0,
              text: response.usage?.completionTokens || 0,
              reasoning: undefined,
            },
          },
          warnings: [],
          request: {
            body: request,
          },
          response: {
            id: response.id || generateId(),
            timestamp: new Date(),
            modelId: config.endpoint.id,
          },
        };
      } finally {
        sess.close();
      }
    },

    async doStream(
      options: LanguageModelV3CallOptions
    ): Promise<LanguageModelV3StreamResult> {
      const sess = await createSession();

      // Convert AI SDK prompt format to server's expected format
      const messages = convertPromptToMessages(options.prompt);

      const request = {
        model: config.modelId,
        messages,
        stream: true,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
      };

      const requestBytes = new TextEncoder().encode(JSON.stringify(request));
      const textId = generateId();

      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          try {
            // Emit stream-start
            controller.enqueue({
              type: 'stream-start',
              warnings: [],
            });

            // Emit text-start
            controller.enqueue({
              type: 'text-start',
              id: textId,
            });

            let totalPromptTokens = 0;
            let totalCompletionTokens = 0;

            for await (const chunk of sess.sendAndStream(requestBytes)) {
              const decoded = JSON.parse(new TextDecoder().decode(chunk));

              // Handle streaming chunks (type: 'text-delta')
              if (decoded.type === 'text-delta') {
                controller.enqueue({
                  type: 'text-delta',
                  id: textId,
                  delta: decoded.text,
                });
              } else if (decoded.type === 'finish') {
                totalPromptTokens = decoded.usage?.promptTokens || 0;
                totalCompletionTokens = decoded.usage?.completionTokens || 0;

                // Emit text-end
                controller.enqueue({
                  type: 'text-end',
                  id: textId,
                });

                // Emit finish
                controller.enqueue({
                  type: 'finish',
                  finishReason: {
                    unified: decoded.finishReason || 'stop',
                    raw: decoded.rawFinishReason,
                  },
                  usage: {
                    inputTokens: {
                      total: totalPromptTokens,
                      noCache: totalPromptTokens,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: {
                      total: totalCompletionTokens,
                      text: totalCompletionTokens,
                      reasoning: undefined,
                    },
                  },
                });

                controller.close();
                return;
              } else if (decoded.content !== undefined) {
                // Handle single response format (server returns InferenceResponse)
                // Server currently doesn't stream, so we get one complete response
                if (decoded.content) {
                  controller.enqueue({
                    type: 'text-delta',
                    id: textId,
                    delta: decoded.content,
                  });
                }

                // Emit text-end
                controller.enqueue({
                  type: 'text-end',
                  id: textId,
                });

                // Emit finish
                controller.enqueue({
                  type: 'finish',
                  finishReason: {
                    unified: decoded.finish_reason || 'stop',
                    raw: undefined,
                  },
                  usage: {
                    inputTokens: {
                      total: 0,
                      noCache: 0,
                      cacheRead: undefined,
                      cacheWrite: undefined,
                    },
                    outputTokens: {
                      total: 0,
                      text: 0,
                      reasoning: undefined,
                    },
                  },
                });

                controller.close();
                return;
              }
            }

            // If we reach here without a finish event, close gracefully
            controller.enqueue({
              type: 'text-end',
              id: textId,
            });

            controller.enqueue({
              type: 'finish',
              finishReason: {
                unified: 'stop',
                raw: undefined,
              },
              usage: {
                inputTokens: {
                  total: totalPromptTokens,
                  noCache: totalPromptTokens,
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {
                  total: totalCompletionTokens,
                  text: totalCompletionTokens,
                  reasoning: undefined,
                },
              },
            });

            controller.close();
          } catch (error) {
            controller.enqueue({
              type: 'error',
              error,
            });
            controller.close();
          } finally {
            sess.close();
          }
        },
      });

      return {
        stream,
        request: {
          body: request,
        },
      };
    },
  };
}

const providerCache = new Map<string, LanguageModelV3>();

export function getPrivateInferenceModel(
  config: PrivateInferenceConfig
): LanguageModelV3 {
  // Include modelId in cache key so different models get separate providers
  const cacheKey = `${config.endpoint.id}:${config.modelId || 'default'}`;

  if (!providerCache.has(cacheKey)) {
    providerCache.set(cacheKey, createPrivateInferenceModel(config));
  }

  return providerCache.get(cacheKey)!;
}

export function clearPrivateInferenceCache(): void {
  providerCache.clear();
}
