/**
 * Structured Output Generation
 * Wrapper around AI SDK's generateObject for type-safe structured responses
 */

import { generateObject } from 'ai';
import type { z } from 'zod';
import { getModelForCredential } from './providers';
import { getCredentialById, parseModelId } from './credentials';

/**
 * Options for generating structured output
 */
export interface GenerateStructuredOutputOptions<T extends z.ZodType> {
  /**
   * Model ID in format: credentialId:modelName
   */
  modelId: string;

  /**
   * Zod schema defining the output structure
   */
  schema: T;

  /**
   * User prompt describing what to generate
   */
  prompt: string;

  /**
   * Optional system prompt
   */
  system?: string;

  /**
   * Optional temperature (0-2)
   */
  temperature?: number;

  /**
   * Optional max tokens
   */
  maxTokens?: number;

  /**
   * Optional abort signal for cancellation
   */
  abortSignal?: AbortSignal;
}

/**
 * Result of structured output generation
 */
export interface GenerateStructuredOutputResult<T> {
  /**
   * The generated structured object
   */
  object: T;

  /**
   * Token usage information (if available)
   */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Generate structured output using AI SDK's generateObject
 *
 * This replaces fragile regex-based JSON extraction with proper schema validation.
 * The AI SDK handles structured output generation with built-in retry logic
 * for malformed responses.
 *
 * @example
 * ```ts
 * const { object } = await generateStructuredOutput({
 *   modelId: 'cred123:gpt-4',
 *   schema: TitleSchema,
 *   prompt: 'Generate a title for this conversation...',
 * });
 * console.log(object.title); // Type-safe access
 * ```
 */
export async function generateStructuredOutput<T extends z.ZodType>(
  options: GenerateStructuredOutputOptions<T>
): Promise<GenerateStructuredOutputResult<z.infer<T>>> {
  const { modelId, schema, prompt, system, temperature = 0.7, maxTokens, abortSignal } = options;

  // Parse model ID to get credential and model name
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

  // Use AI SDK's generateObject for structured output
  const result = await generateObject({
    model,
    schema,
    prompt,
    system,
    temperature,
    maxOutputTokens: maxTokens,
    abortSignal,
  });

  return {
    object: result.object,
    usage: result.usage,
  };
}

/**
 * Generate structured output from messages (for chat-based generation)
 */
export async function generateStructuredOutputFromMessages<T extends z.ZodType>(options: {
  modelId: string;
  schema: T;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}): Promise<GenerateStructuredOutputResult<z.infer<T>>> {
  const { modelId, schema, messages, temperature = 0.7, maxTokens, abortSignal } = options;

  const { credentialId, modelName } = parseModelId(modelId);

  if (!credentialId) {
    throw new Error('No credential ID in model selection');
  }

  const credential = getCredentialById(credentialId);
  if (!credential) {
    throw new Error(`Credential not found: ${credentialId}`);
  }

  const model = getModelForCredential(credential, modelName);

  const result = await generateObject({
    model,
    schema,
    messages,
    temperature,
    maxOutputTokens: maxTokens,
    abortSignal,
  });

  return {
    object: result.object,
    usage: result.usage,
  };
}
