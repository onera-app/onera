import type { UIMessage } from 'ai';
import type { ChatMessage, MessageContent } from '@onera/types';

/**
 * Convert ChatMessage (storage format) to UIMessage (AI SDK format)
 */
export function toUIMessage(msg: ChatMessage): UIMessage {
  const content = typeof msg.content === 'string'
    ? msg.content
    : msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');

  return {
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text', text: content }],
  };
}

/**
 * Convert UIMessage (AI SDK format) to ChatMessage (storage format)
 */
export function toChatMessage(msg: UIMessage, model?: string): ChatMessage {
  let content = '';
  if (msg.parts) {
    for (const part of msg.parts) {
      if (part.type === 'text') {
        content += part.text;
      }
    }
  }

  return {
    id: msg.id,
    role: msg.role,
    content,
    created_at: Date.now(),
    model: msg.role === 'assistant' ? model : undefined,
  };
}

/**
 * Get the text content from a ChatMessage
 * Handles both string content and multimodal content arrays
 */
export function getMessageText(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter((c): c is MessageContent & { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text || '')
    .join('\n');
}

/**
 * Compare two message arrays for equality to avoid unnecessary re-renders
 */
export function areMessagesEqual(a: ChatMessage[], b: ChatMessage[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((msg, i) =>
    msg.id === b[i].id &&
    msg.content === b[i].content &&
    msg.role === b[i].role
  );
}
