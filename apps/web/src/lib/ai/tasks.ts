/**
 * AI Task Utilities
 * Client-side generation for titles and follow-ups using the LLM
 */

import { generateText } from 'ai';
import { getModelForCredential, getPrivateInferenceModel } from './providers';
import { getCredentialById, parseModelId } from './credentials';
import type { ChatMessage } from '@onera/types';
import type { EnclaveConfig } from './transport';

// Store enclave config for private model tasks
let currentEnclaveConfig: EnclaveConfig | null = null;

/**
 * Set the enclave config for private model title/follow-up generation
 */
export function setEnclaveConfigForTasks(config: EnclaveConfig | null): void {
  currentEnclaveConfig = config;
}

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
 * Extract JSON from response text (returns null on failure instead of throwing)
 */
function extractJson(text: string): unknown | null {
  // Clean the text
  const cleaned = stripThinkingTags(text);

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // JSON was malformed, try to fix common issues
    }
  }

  // Try parsing the whole thing
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Extract title from response using various methods
 */
function extractTitle(text: string): string | null {
  const cleaned = stripThinkingTags(text);

  // Try JSON parsing first
  const json = extractJson(text);
  if (json && typeof json === 'object' && 'title' in json) {
    const title = (json as { title: unknown }).title;
    if (typeof title === 'string' && title.length > 0) {
      return title.slice(0, 100);
    }
  }

  // Try to extract title from malformed JSON like { "title": "Some Title
  const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].slice(0, 100);
  }

  // If response is short and clean, use it directly
  const trimmed = cleaned.replace(/[{}"]/g, '').trim();
  if (trimmed.length > 0 && trimmed.length < 100 && !trimmed.includes('\n')) {
    return trimmed;
  }

  return null;
}

/**
 * Extract follow-ups from response using various methods
 */
function extractFollowUps(text: string, count: number): string[] {
  const cleaned = stripThinkingTags(text);

  // Try JSON parsing first
  const json = extractJson(text);
  if (json && typeof json === 'object' && 'follow_ups' in json) {
    const followUps = (json as { follow_ups: unknown }).follow_ups;
    if (Array.isArray(followUps)) {
      return followUps
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .slice(0, count);
    }
  }

  // Try to extract from malformed JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (Array.isArray(arr)) {
        return arr
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .slice(0, count);
      }
    } catch {
      // Continue to fallback
    }
  }

  // Extract quoted strings that look like questions
  const quotedQuestions = cleaned.match(/"([^"]{10,200}\?)"/g);
  if (quotedQuestions && quotedQuestions.length > 0) {
    return quotedQuestions
      .map(q => q.replace(/^"|"$/g, ''))
      .slice(0, count);
  }

  // Fallback: extract lines that look like questions
  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 10 || line.length > 200) return false;
      if (line.startsWith('{') || line.startsWith('[')) return false;
      return line.endsWith('?') || line.match(/^\d+\./);
    })
    .map((line) => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim());

  return lines.slice(0, count);
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

  const { credentialId, modelName, isPrivate } = parseModelId(modelId);

  let model;

  if (isPrivate) {
    // Use private inference model
    if (!currentEnclaveConfig) {
      console.warn('No enclave config for private model title generation');
      return null;
    }
    model = getPrivateInferenceModel({
      endpoint: currentEnclaveConfig.endpoint,
      wsEndpoint: currentEnclaveConfig.wsEndpoint,
      attestationEndpoint: currentEnclaveConfig.attestationEndpoint,
      expectedMeasurements: currentEnclaveConfig.expectedMeasurements,
    });
  } else {
    // Use credential-based model
    if (!credentialId) {
      console.warn('No credential ID for title generation');
      return null;
    }

    const credential = getCredentialById(credentialId);
    if (!credential) {
      console.warn('Credential not found for title generation');
      return null;
    }

    model = getModelForCredential(credential, modelName);
  }

  const messagesText = formatMessagesForPrompt(messages, 4);
  const prompt = TITLE_GENERATION_PROMPT + messagesText;

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 200,
    });

    return extractTitle(result.text);
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

  const { credentialId, modelName, isPrivate } = parseModelId(modelId);

  let model;

  if (isPrivate) {
    // Use private inference model
    if (!currentEnclaveConfig) {
      console.warn('No enclave config for private model follow-up generation');
      return [];
    }
    model = getPrivateInferenceModel({
      endpoint: currentEnclaveConfig.endpoint,
      wsEndpoint: currentEnclaveConfig.wsEndpoint,
      attestationEndpoint: currentEnclaveConfig.attestationEndpoint,
      expectedMeasurements: currentEnclaveConfig.expectedMeasurements,
    });
  } else {
    // Use credential-based model
    if (!credentialId) {
      console.warn('No credential ID for follow-up generation');
      return [];
    }

    const credential = getCredentialById(credentialId);
    if (!credential) {
      console.warn('Credential not found for follow-up generation');
      return [];
    }

    model = getModelForCredential(credential, modelName);
  }

  const messagesText = formatMessagesForPrompt(messages, 6);
  const prompt = FOLLOW_UP_GENERATION_PROMPT + messagesText;

  try {
    const result = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 500,
    });

    return extractFollowUps(result.text, count);
  } catch (error) {
    console.warn('Follow-up generation failed:', error);
    return [];
  }
}
