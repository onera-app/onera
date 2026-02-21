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
 * Preserves multimodal content (images) from AI SDK format
 */
export function toChatMessage(msg: UIMessage, model?: string): ChatMessage {
  if (!msg.parts || msg.parts.length === 0) {
    return {
      id: msg.id,
      role: msg.role,
      content: (msg as any).content || '',
      created_at: Date.now(),
      model: msg.role === 'assistant' ? model : undefined,
    };
  }

  // Check if we have any file parts (images are stored as 'file' type in AI SDK)
  // Use 'in' operator to check for file-like properties since AI SDK types may vary
  const hasMultimodal = msg.parts.some(part => {
    if (part.type === 'text') return false;
    // Check for file-like parts by looking for url or data properties
    return 'url' in part || 'data' in part;
  });

  if (!hasMultimodal) {
    // Text-only message
    const textContent = msg.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map(part => part.text)
      .join('');

    return {
      id: msg.id,
      role: msg.role,
      content: textContent || '',
      created_at: Date.now(),
      model: msg.role === 'assistant' ? model : undefined,
    };
  }

  // Multimodal message - convert to MessageContent[]
  const contentParts: MessageContent[] = [];

  for (const part of msg.parts) {
    if (part.type === 'text') {
      contentParts.push({ type: 'text', text: part.text });
    } else if ('url' in part || 'data' in part) {
      // AI SDK stores images as parts with url/data properties
      // Convert to our 'image_url' format
      const filePart = part as { url?: string; data?: string; mediaType?: string };
      const url = filePart.url || (filePart.data ? `data:${filePart.mediaType || 'image/png'};base64,${filePart.data}` : '');
      if (url) {
        contentParts.push({
          type: 'image_url',
          image_url: { url },
        });
      }
    }
  }

  return {
    id: msg.id,
    role: msg.role,
    content: contentParts.length > 0 ? contentParts : '',
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
  return a.every((msg, i) => {
    if (msg.id !== b[i].id) return false;
    if (msg.role !== b[i].role) return false;

    // Compare content
    if (typeof msg.content === 'string' && typeof b[i].content === 'string') {
      return msg.content === b[i].content;
    }

    // Compare object content by stringifying
    return JSON.stringify(msg.content) === JSON.stringify(b[i].content);
  });
}
