/**
 * Message Tree Utilities
 *
 * These utilities help manage the message tree structure for branching conversations.
 * Messages are stored in a tree where each message can have multiple children (branches).
 */

import type { ChatMessage, ChatHistory } from '@onera/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Convert tree structure to linear array (for display or API calls)
 */
export function createMessagesList(history: ChatHistory, messageId?: string | null): ChatMessage[] {
  const targetId = messageId ?? history.currentId;
  if (!targetId || !history.messages[targetId]) {
    return [];
  }

  const result: ChatMessage[] = [];
  let currentMsg: ChatMessage | undefined = history.messages[targetId];

  // Walk up the tree to root
  while (currentMsg) {
    result.unshift(currentMsg);
    currentMsg = currentMsg.parentId ? history.messages[currentMsg.parentId] : undefined;
  }

  return result;
}

/**
 * Get siblings of a message (messages with the same parent)
 */
export function getSiblings(history: ChatHistory, messageId: string): string[] {
  const message = history.messages[messageId];
  if (!message) return [messageId];

  if (message.parentId) {
    const parent = history.messages[message.parentId];
    return parent?.childrenIds ?? [messageId];
  }

  // Root messages - find all messages with no parent
  return Object.values(history.messages)
    .filter((m) => !m.parentId)
    .map((m) => m.id);
}

/**
 * Get the index of a message among its siblings
 */
export function getSiblingIndex(history: ChatHistory, messageId: string): number {
  const siblings = getSiblings(history, messageId);
  return siblings.indexOf(messageId);
}

/**
 * Navigate to the deepest child of a message (following the last child at each level)
 */
export function getDeepestChild(history: ChatHistory, messageId: string): string {
  let current = messageId;
  let msg = history.messages[current];

  while (msg && msg.childrenIds && msg.childrenIds.length > 0) {
    current = msg.childrenIds[msg.childrenIds.length - 1];
    msg = history.messages[current];
  }

  return current;
}

/**
 * Navigate to previous sibling's deepest child
 */
export function getPreviousBranch(history: ChatHistory, messageId: string): string | null {
  const siblings = getSiblings(history, messageId);
  const currentIdx = siblings.indexOf(messageId);

  if (currentIdx <= 0) return null;

  const prevSiblingId = siblings[currentIdx - 1];
  return getDeepestChild(history, prevSiblingId);
}

/**
 * Navigate to next sibling's deepest child
 */
export function getNextBranch(history: ChatHistory, messageId: string): string | null {
  const siblings = getSiblings(history, messageId);
  const currentIdx = siblings.indexOf(messageId);

  if (currentIdx >= siblings.length - 1) return null;

  const nextSiblingId = siblings[currentIdx + 1];
  return getDeepestChild(history, nextSiblingId);
}

/**
 * Add a new message to the tree
 */
export function addMessage(
  history: ChatHistory,
  message: Omit<ChatMessage, 'id' | 'parentId' | 'childrenIds'>,
  parentId: string | null = null
): { history: ChatHistory; messageId: string } {
  const messageId = uuidv4();

  const newMessage: ChatMessage = {
    ...message,
    id: messageId,
    parentId,
    childrenIds: [],
  };

  const newHistory: ChatHistory = {
    ...history,
    messages: {
      ...history.messages,
      [messageId]: newMessage,
    },
    currentId: messageId,
  };

  // Update parent's childrenIds
  if (parentId && newHistory.messages[parentId]) {
    newHistory.messages[parentId] = {
      ...newHistory.messages[parentId],
      childrenIds: [...(newHistory.messages[parentId].childrenIds || []), messageId],
    };
  }

  return { history: newHistory, messageId };
}

/**
 * Edit a message in place (without creating a branch)
 */
export function editMessageInPlace(
  history: ChatHistory,
  messageId: string,
  newContent: string | ChatMessage['content']
): ChatHistory {
  const message = history.messages[messageId];
  if (!message) return history;

  return {
    ...history,
    messages: {
      ...history.messages,
      [messageId]: {
        ...message,
        content: newContent,
        edited: true,
        editedAt: Date.now(),
      },
    },
  };
}

/**
 * Create a new branch by editing a message (creates a sibling)
 */
export function createBranchFromEdit(
  history: ChatHistory,
  originalMessageId: string,
  newContent: string | ChatMessage['content']
): { history: ChatHistory; newMessageId: string } {
  const originalMessage = history.messages[originalMessageId];
  if (!originalMessage) {
    return { history, newMessageId: originalMessageId };
  }

  const newMessageId = uuidv4();
  const newMessage: ChatMessage = {
    ...originalMessage,
    id: newMessageId,
    content: newContent,
    created_at: Date.now(),
    childrenIds: [], // New branch has no children yet
  };

  const newHistory: ChatHistory = {
    ...history,
    messages: {
      ...history.messages,
      [newMessageId]: newMessage,
    },
    currentId: newMessageId,
  };

  // Update parent's childrenIds to include the new sibling
  const parentId = originalMessage.parentId;
  if (parentId && newHistory.messages[parentId]) {
    newHistory.messages[parentId] = {
      ...newHistory.messages[parentId],
      childrenIds: [...(newHistory.messages[parentId].childrenIds || []), newMessageId],
    };
  }

  return { history: newHistory, newMessageId };
}

/**
 * Delete a message and optionally its children
 */
export function deleteMessage(
  history: ChatHistory,
  messageId: string,
  deleteChildren: boolean = true
): ChatHistory {
  const message = history.messages[messageId];
  if (!message) return history;

  const idsToDelete = new Set<string>([messageId]);

  // Collect all descendants if deleteChildren is true
  if (deleteChildren && message.childrenIds) {
    const collectChildren = (id: string) => {
      const msg = history.messages[id];
      if (msg?.childrenIds) {
        msg.childrenIds.forEach((childId) => {
          idsToDelete.add(childId);
          collectChildren(childId);
        });
      }
    };
    collectChildren(messageId);
  }

  // Create new messages object without deleted messages
  const newMessages = { ...history.messages };
  idsToDelete.forEach((id) => delete newMessages[id]);

  // Update parent's childrenIds
  const parentId = message.parentId;
  if (parentId && newMessages[parentId]) {
    newMessages[parentId] = {
      ...newMessages[parentId],
      childrenIds: (newMessages[parentId].childrenIds || []).filter((id) => id !== messageId),
    };
  }

  // Update currentId if it was deleted
  let newCurrentId = history.currentId;
  if (newCurrentId && idsToDelete.has(newCurrentId)) {
    newCurrentId = parentId ?? null;
  }

  return {
    currentId: newCurrentId,
    messages: newMessages,
  };
}

/**
 * Switch to a different branch (navigate to a message and its branch)
 */
export function switchToBranch(history: ChatHistory, messageId: string): ChatHistory {
  if (!history.messages[messageId]) return history;

  // Navigate to the deepest child of this message
  const leafId = getDeepestChild(history, messageId);

  return {
    ...history,
    currentId: leafId,
  };
}

/**
 * Check if the history has any branches (more than one path)
 */
export function hasBranches(history: ChatHistory): boolean {
  return Object.values(history.messages).some((msg) => (msg.childrenIds?.length || 0) > 1);
}

/**
 * Get branch info for display (e.g., "2/3" meaning branch 2 of 3)
 */
export function getBranchInfo(
  history: ChatHistory,
  messageId: string
): { current: number; total: number } | null {
  const siblings = getSiblings(history, messageId);
  if (siblings.length <= 1) return null;

  const currentIdx = siblings.indexOf(messageId);
  return {
    current: currentIdx + 1,
    total: siblings.length,
  };
}
