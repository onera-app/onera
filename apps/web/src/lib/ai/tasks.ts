/**
 * AI Task Utilities
 * Client-side generation for titles and follow-ups using the LLM
 */

import type { ChatMessage } from '@onera/types';
import { generateStructuredOutput } from './structuredOutput';
import { TitleSchema, FollowUpsSchema } from './schemas';
import { withRetry } from './retry';

/**
 * Default retry configuration for task generation
 * - 2 retries (3 total attempts)
 * - 1 second base delay with exponential backoff
 * - Retries on rate limits, timeouts, and server errors
 */
const TASK_RETRY_CONFIG = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
};

/**
 * System prompt for title generation
 */
const TITLE_SYSTEM_PROMPT = `You are a helpful assistant that generates concise chat titles.

Guidelines:
- Generate a 3-5 word title summarizing the main theme of the conversation
- Keep it clear and simple, prioritize accuracy over creativity
- Use the conversation's primary language; default to English if multilingual`;

/**
 * System prompt for follow-up generation
 */
const FOLLOW_UP_SYSTEM_PROMPT = `You are a helpful assistant that suggests relevant follow-up questions.

Guidelines:
- Suggest questions from the user's perspective, directed to the assistant
- Make questions concise, clear, and directly related to the discussed topic(s)
- Do not repeat what was already covered in the conversation
- Use the conversation's primary language; default to English if multilingual`;

/**
 * Format messages for task prompts
 */
function formatMessagesForPrompt(messages: ChatMessage[], maxMessages = 6): string {
  const recentMessages = messages.slice(-maxMessages);
  return recentMessages
    .map((m) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `${m.role}: ${content.slice(0, 500)}`;
    })
    .join('\n');
}

/**
 * Generate a chat title from messages
 * Uses AI SDK's generateObject for reliable structured output
 * Includes retry logic for transient failures
 */
export async function generateChatTitle(
  messages: ChatMessage[],
  modelId: string
): Promise<string | null> {
  // Need at least one message
  if (messages.length < 1) {
    return null;
  }

  const messagesText = formatMessagesForPrompt(messages, 4);
  const prompt = `Generate a concise title for this conversation:\n\n${messagesText}`;

  try {
    const { result } = await withRetry(
      () =>
        generateStructuredOutput({
          modelId,
          schema: TitleSchema,
          prompt,
          system: TITLE_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 100,
        }),
      TASK_RETRY_CONFIG
    );

    return result.object.title;
  } catch (error) {
    console.warn('Title generation failed:', error);
    return null;
  }
}

/**
 * Generate follow-up suggestions from messages
 * Uses AI SDK's generateObject for reliable structured output
 * Includes retry logic for transient failures
 */
export async function generateFollowUps(
  messages: ChatMessage[],
  modelId: string,
  count = 3
): Promise<string[]> {
  // Need at least one exchange (user + assistant)
  if (messages.length < 2) {
    return [];
  }

  const messagesText = formatMessagesForPrompt(messages, 6);
  const prompt = `Based on this conversation, suggest ${count} relevant follow-up questions:\n\n${messagesText}`;

  try {
    const { result } = await withRetry(
      () =>
        generateStructuredOutput({
          modelId,
          schema: FollowUpsSchema,
          prompt,
          system: FOLLOW_UP_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 500,
        }),
      TASK_RETRY_CONFIG
    );

    return result.object.followUps.slice(0, count);
  } catch (error) {
    console.warn('Follow-up generation failed:', error);
    return [];
  }
}
