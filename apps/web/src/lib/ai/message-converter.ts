import type { ChatMessage, ChatHistory, MessageContent } from "@onera/types";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { createMessagesList } from "@/lib/messageTree";

export function chatHistoryToThreadMessages(
  history: ChatHistory,
): ThreadMessageLike[] {
  if (!history.currentId) return [];
  const linearMessages = createMessagesList(history);
  return linearMessages.map((msg) => ({
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
  }));
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
