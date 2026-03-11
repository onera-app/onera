import { describe, it, expect } from "bun:test";
import {
  chatHistoryToThreadMessages,
  threadMessageToChatMessage,
  addThreadMessageToHistory,
} from "../message-converter";
import type { ChatHistory } from "@onera/types";

describe("chatHistoryToThreadMessages", () => {
  it("converts a linear chat history to ThreadMessageLike[]", () => {
    const history: ChatHistory = {
      currentId: "msg-2",
      messages: {
        "msg-1": { id: "msg-1", role: "user", content: "Hello", created_at: 1000, parentId: null, childrenIds: ["msg-2"] },
        "msg-2": { id: "msg-2", role: "assistant", content: "Hi there!", created_at: 2000, parentId: "msg-1", childrenIds: [], model: "openai:gpt-4" },
      },
    };
    const result = chatHistoryToThreadMessages(history);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("user");
    expect(result[0].content).toEqual([{ type: "text", text: "Hello" }]);
    expect(result[1].role).toBe("assistant");
    expect(result[1].content).toEqual([{ type: "text", text: "Hi there!" }]);
    expect(result[1].metadata?.custom?.model).toBe("openai:gpt-4");
  });

  it("follows the active branch via currentId", () => {
    const history: ChatHistory = {
      currentId: "msg-2b",
      messages: {
        "msg-1": { id: "msg-1", role: "user", content: "Hello", created_at: 1000, parentId: null, childrenIds: ["msg-2a", "msg-2b"] },
        "msg-2a": { id: "msg-2a", role: "assistant", content: "Response A", created_at: 2000, parentId: "msg-1", childrenIds: [] },
        "msg-2b": { id: "msg-2b", role: "assistant", content: "Response B", created_at: 3000, parentId: "msg-1", childrenIds: [] },
      },
    };
    const result = chatHistoryToThreadMessages(history);
    expect(result).toHaveLength(2);
    expect(result[1].content).toEqual([{ type: "text", text: "Response B" }]);
  });

  it("handles multimodal content (images, documents)", () => {
    const history: ChatHistory = {
      currentId: "msg-1",
      messages: {
        "msg-1": {
          id: "msg-1", role: "user",
          content: [
            { type: "text", text: "Look at this" },
            { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
          ],
          created_at: 1000, parentId: null, childrenIds: [],
        },
      },
    };
    const result = chatHistoryToThreadMessages(history);
    expect(result[0].content).toEqual([
      { type: "text", text: "Look at this" },
      { type: "image", image: "data:image/png;base64,abc" },
    ]);
  });

  it("returns empty array for empty history", () => {
    const history: ChatHistory = { currentId: null, messages: {} };
    const result = chatHistoryToThreadMessages(history);
    expect(result).toEqual([]);
  });
});

describe("threadMessageToChatMessage", () => {
  it("converts a user ThreadMessage to ChatMessage", () => {
    const threadMsg = {
      id: "msg-1", role: "user" as const,
      content: [{ type: "text" as const, text: "Hello" }],
      createdAt: new Date(1000),
    };
    const result = threadMessageToChatMessage(threadMsg);
    expect(result.id).toBe("msg-1");
    expect(result.role).toBe("user");
    expect(result.content).toBe("Hello");
    expect(result.created_at).toBe(1000);
  });

  it("converts an assistant ThreadMessage with model metadata", () => {
    const threadMsg = {
      id: "msg-2", role: "assistant" as const,
      content: [{ type: "text" as const, text: "Hi there!" }],
      createdAt: new Date(2000),
      metadata: { custom: { model: "openai:gpt-4" } },
    };
    const result = threadMessageToChatMessage(threadMsg);
    expect(result.role).toBe("assistant");
    expect(result.content).toBe("Hi there!");
    expect(result.model).toBe("openai:gpt-4");
  });
});

describe("addThreadMessageToHistory", () => {
  it("adds a message as child of the current leaf", () => {
    const history: ChatHistory = {
      currentId: "msg-1",
      messages: {
        "msg-1": { id: "msg-1", role: "user", content: "Hello", created_at: 1000, parentId: null, childrenIds: [] },
      },
    };
    const threadMsg = {
      id: "msg-2", role: "assistant" as const,
      content: [{ type: "text" as const, text: "Hi!" }],
      createdAt: new Date(2000),
      metadata: { custom: { model: "openai:gpt-4" } },
    };
    const updated = addThreadMessageToHistory(history, threadMsg);
    expect(updated.currentId).toBe("msg-2");
    expect(updated.messages["msg-2"].parentId).toBe("msg-1");
    expect(updated.messages["msg-1"].childrenIds).toContain("msg-2");
  });

  it("creates a branch when adding to a node that already has children", () => {
    const history: ChatHistory = {
      currentId: "msg-2a",
      messages: {
        "msg-1": { id: "msg-1", role: "user", content: "Hello", created_at: 1000, parentId: null, childrenIds: ["msg-2a"] },
        "msg-2a": { id: "msg-2a", role: "assistant", content: "Response A", created_at: 2000, parentId: "msg-1", childrenIds: [] },
      },
    };
    const threadMsg = {
      id: "msg-2b", role: "assistant" as const,
      content: [{ type: "text" as const, text: "Response B" }],
      createdAt: new Date(3000),
    };
    const updated = addThreadMessageToHistory(history, threadMsg, "msg-1");
    expect(updated.messages["msg-1"].childrenIds).toEqual(["msg-2a", "msg-2b"]);
    expect(updated.messages["msg-2b"].parentId).toBe("msg-1");
    expect(updated.currentId).toBe("msg-2b");
  });
});
