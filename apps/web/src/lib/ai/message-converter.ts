import type { ChatMessage, ChatHistory, MessageContent } from "@onera/types";
import type { ThreadMessageLike, ExportedMessageRepositoryItem } from "@assistant-ui/react";
import { ExportedMessageRepository } from "@assistant-ui/react";
import type { ExportedMessageRepository as ExportedMessageRepositoryType } from "@assistant-ui/react";
import { createMessagesList } from "@/lib/messageTree";

export function chatHistoryToThreadMessages(
  history: ChatHistory,
): ThreadMessageLike[] {
  if (!history.currentId) return [];
  const linearMessages = createMessagesList(history);
  return linearMessages.map((msg) => chatMessageToThreadMessageLike(msg));
}

/**
 * Convert a ChatHistory tree into an ExportedMessageRepository that preserves
 * ALL branches, not just the active path.
 *
 * Messages are topologically sorted (parents before children) so that
 * MessageRepository.import() can reconstruct the full tree.
 *
 * Uses ExportedMessageRepository.fromArray to convert each ThreadMessageLike
 * into a proper ThreadMessage (via the library's internal fromThreadMessageLike),
 * then re-assembles with the original tree parentIds.
 */
export function chatHistoryToExportedRepository(
  history: ChatHistory,
): ExportedMessageRepositoryType {
  if (!history.currentId || Object.keys(history.messages).length === 0) {
    return { headId: null, messages: [] };
  }

  // Topological sort: BFS from roots (messages with no parentId or whose
  // parentId is not in the map).
  const allMessages = history.messages;
  const sorted: ChatMessage[] = [];
  const visited = new Set<string>();

  // Find root messages (no parent or parent not in map)
  const queue: string[] = [];
  for (const id of Object.keys(allMessages)) {
    const msg = allMessages[id];
    if (!msg.parentId || !allMessages[msg.parentId]) {
      queue.push(id);
    }
  }

  // BFS ensures parents are always before children
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    const msg = allMessages[id];
    if (!msg) continue;

    sorted.push(msg);

    for (const childId of msg.childrenIds ?? []) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  // Convert each ChatMessage to a ThreadMessageLike, then use
  // ExportedMessageRepository.fromArray (on single-element arrays) to get
  // proper ThreadMessage objects with all required metadata fields.
  // We then build an index so we can re-wire parentIds from our tree.
  const convertedById = new Map<string, ExportedMessageRepositoryItem["message"]>();
  for (const msg of sorted) {
    const like = chatMessageToThreadMessageLike(msg);
    const { messages: converted } = ExportedMessageRepository.fromArray([like]);
    if (converted[0]) {
      convertedById.set(msg.id, converted[0].message);
    }
  }

  return {
    headId: history.currentId,
    messages: sorted
      .filter((msg) => convertedById.has(msg.id))
      .map((msg) => ({
        parentId: msg.parentId && allMessages[msg.parentId] ? msg.parentId : null,
        message: convertedById.get(msg.id)!,
      })),
  };
}

/** Convert a single ChatMessage to the simpler ThreadMessageLike shape. */
function chatMessageToThreadMessageLike(msg: ChatMessage): ThreadMessageLike {
  return {
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: convertContentToThreadParts(msg.content),
    createdAt: new Date(msg.created_at),
    ...(msg.model || msg.followUps
      ? {
          metadata: {
            custom: {
              ...(msg.model ? { model: msg.model } : {}),
              ...(msg.followUps ? { followUps: msg.followUps } : {}),
            },
          },
        }
      : {}),
  };
}

function convertContentToThreadParts(
  content: string | MessageContent[],
): ThreadMessageLike["content"] {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  return content.map((part) => {
    switch (part.type) {
      case "text":
        return { type: "text" as const, text: part.text || "" };
      case "image_url":
        return { type: "image" as const, image: part.image_url?.url || "" };
      case "document_url": {
        const docText = part.document_url?.extractedText
          ? `[Document: ${part.document_url.fileName}]\n${part.document_url.extractedText}`
          : `[Document: ${part.document_url?.fileName || "unknown"}]`;
        return { type: "text" as const, text: docText };
      }
      default:
        return { type: "text" as const, text: "" };
    }
  });
}

export function threadMessageToChatMessage(
  msg: {
    id: string;
    role: "user" | "assistant" | "system";
    content: Array<{ type: string; text?: string; image?: string }>;
    createdAt?: Date;
    metadata?: { custom?: { model?: string; followUps?: string[] } };
  },
  parentId?: string | null,
): ChatMessage {
  const textParts = msg.content.filter((p) => p.type === "text");
  const imageParts = msg.content.filter((p) => p.type === "image");

  let content: string | MessageContent[];
  if (imageParts.length > 0) {
    const parts: MessageContent[] = [];
    for (const p of msg.content) {
      if (p.type === "text") parts.push({ type: "text", text: p.text || "" });
      else if (p.type === "image") parts.push({ type: "image_url", image_url: { url: p.image || "" } });
    }
    content = parts;
  } else {
    content = textParts.map((p) => p.text || "").join("");
  }

  return {
    id: msg.id,
    role: msg.role,
    content,
    created_at: msg.createdAt?.getTime() || Date.now(),
    model: msg.metadata?.custom?.model,
    parentId: parentId ?? null,
    childrenIds: [],
    followUps: msg.metadata?.custom?.followUps,
  };
}

export function addThreadMessageToHistory(
  history: ChatHistory,
  msg: {
    id: string;
    role: "user" | "assistant" | "system";
    content: Array<{ type: string; text?: string; image?: string }>;
    createdAt?: Date;
    metadata?: { custom?: { model?: string; followUps?: string[] } };
  },
  parentId?: string | null,
): ChatHistory {
  const effectiveParentId = parentId ?? history.currentId;
  const chatMessage = threadMessageToChatMessage(msg, effectiveParentId);
  const newMessages = { ...history.messages };
  newMessages[msg.id] = chatMessage;

  if (effectiveParentId && newMessages[effectiveParentId]) {
    const parent = { ...newMessages[effectiveParentId] };
    if (!parent.childrenIds?.includes(msg.id)) {
      parent.childrenIds = [...(parent.childrenIds || []), msg.id];
    }
    newMessages[effectiveParentId] = parent;
  }

  return { currentId: msg.id, messages: newMessages };
}
