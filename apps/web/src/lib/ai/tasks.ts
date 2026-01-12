/**
 * AI Task Utilities
 * Client-side generation for titles and follow-ups using the LLM
 */

import { generateText } from 'ai';
import { getModelForCredential } from './providers';
import { getCredentialById, parseModelId } from './credentials';
import type { ChatMessage } from '@onera/types';

/**
 * Default prompt for title generation
 */
const TITLE_GENERATION_PROMPT = `### Task:
Generate a concise, 3-5 word title summarizing the chat conversation.

### Guidelines:
- The title should clearly represent the main theme or subject of the conversation.
- Keep it clear and simple, prioritize accuracy over creativity.
- Write the title in the chat's primary language; default to English if multilingual.
- Your response must be ONLY the JSON object, no other text.

### Output:
JSON format: { "title": "your concise title here" }

### Examples:
- { "title": "Stock Market Trends" }
- { "title": "Perfect Chocolate Chip Recipe" }
- { "title": "Python Debugging Help" }
- { "title": "Travel Plans for Paris" }

### Chat History:
`;

/**
 * Default prompt for follow-up generation
 */
const FOLLOW_UP_GENERATION_PROMPT = `### Task:
Suggest 3 relevant follow-up questions that the user might naturally ask next, based on the chat history.

### Guidelines:
- Write all questions from the user's perspective, directed to the assistant.
- Make questions concise, clear, and directly related to the discussed topic(s).
- Do not repeat what was already covered in the conversation.
- Use the conversation's primary language; default to English if multilingual.
- Your response must be ONLY the JSON object, no other text.

### Output:
JSON format: { "follow_ups": ["Question 1?", "Question 2?", "Question 3?"] }

### Chat History:
`;

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
 * Strip thinking tags from response (for models that include them)
 */
function stripThinkingTags(text: string): string {
  const thinkingPatterns = [
    /<think>[\s\S]*?<\/think>/gi,
    /<thinking>[\s\S]*?<\/thinking>/gi,
    /<reflection>[\s\S]*?<\/reflection>/gi,
  ];

  let result = text;
  for (const pattern of thinkingPatterns) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * Extract JSON from response text
 */
function extractJson(text: string): unknown {
  // Clean the text
  let cleaned = stripThinkingTags(text);

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  // Try parsing the whole thing
  return JSON.parse(cleaned);
}

/**
 * Generate a chat title from messages
 */
export async function generateChatTitle(
  messages: ChatMessage[],
  modelId: string
): Promise<string | null> {
  // Need at least one message
  if (messages.length < 1) {
    return null;
  }

  const { credentialId, modelName } = parseModelId(modelId);
  if (!credentialId) {
    console.warn('No credential ID for title generation');
    return null;
  }

  const credential = getCredentialById(credentialId);
  if (!credential) {
    console.warn('Credential not found for title generation');
    return null;
  }

  const model = getModelForCredential(credential, modelName);
  const messagesText = formatMessagesForPrompt(messages, 4);
  const prompt = TITLE_GENERATION_PROMPT + messagesText;

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 100,
      temperature: 0.7,
    });

    const parsed = extractJson(result.text) as { title?: string };
    if (parsed?.title && typeof parsed.title === 'string') {
      return parsed.title.slice(0, 100); // Limit length
    }

    // Fallback: try to extract a title from the raw response
    const cleanText = stripThinkingTags(result.text).trim();
    if (cleanText.length > 0 && cleanText.length < 100) {
      return cleanText;
    }

    return null;
  } catch (error) {
    console.warn('Title generation failed:', error);
    return null;
  }
}

/**
 * Generate follow-up suggestions from messages
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

  const { credentialId, modelName } = parseModelId(modelId);
  if (!credentialId) {
    console.warn('No credential ID for follow-up generation');
    return [];
  }

  const credential = getCredentialById(credentialId);
  if (!credential) {
    console.warn('Credential not found for follow-up generation');
    return [];
  }

  const model = getModelForCredential(credential, modelName);
  const messagesText = formatMessagesForPrompt(messages, 6);
  const prompt = FOLLOW_UP_GENERATION_PROMPT + messagesText;

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 500,
      temperature: 0.7,
    });

    const parsed = extractJson(result.text) as { follow_ups?: string[] };
    if (parsed?.follow_ups && Array.isArray(parsed.follow_ups)) {
      return parsed.follow_ups
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .slice(0, count);
    }

    // Fallback: try to extract questions from raw response
    const cleanText = stripThinkingTags(result.text);
    const lines = cleanText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (line.length < 5 || line.length > 200) return false;
        if (line.startsWith('{') || line.startsWith('[')) return false;
        // Look for question-like lines
        return line.endsWith('?') || line.match(/^\d+\./);
      })
      .map((line) => line.replace(/^\d+\.\s*/, '').trim());

    return lines.slice(0, count);
  } catch (error) {
    console.warn('Follow-up generation failed:', error);
    return [];
  }
}
