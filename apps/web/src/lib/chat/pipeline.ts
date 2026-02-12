import type { ChatMessage } from "@onera/types";

export function getTextContent(message: ChatMessage): string {
  if (typeof message.content === "string") {
    return message.content;
  }

  return message.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
}

export function pendingTriggerSignature(chatId: string, messageId: string): string {
  return `${chatId}:${messageId}`;
}

