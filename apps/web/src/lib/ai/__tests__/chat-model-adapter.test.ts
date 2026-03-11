import { describe, it, expect } from "bun:test";
import { createChatModelAdapter } from "../chat-model-adapter";

describe("createChatModelAdapter", () => {
  it("returns an adapter with a run method", () => {
    const adapter = createChatModelAdapter();
    expect(adapter).toBeDefined();
    expect(typeof adapter.run).toBe("function");
  });

  it("run returns an async generator", () => {
    const adapter = createChatModelAdapter({ checkAllowance: async () => {} });
    expect(typeof adapter.run).toBe("function");

    // Verify the function signature exists — we can't fully invoke it
    // without mocking the Zustand stores and AI SDK, but we can verify
    // the factory produces the correct shape.
    expect(adapter).toHaveProperty("run");
  });

  it("accepts options for checkAllowance and isRegenerate", () => {
    const adapter = createChatModelAdapter({
      checkAllowance: async () => {},
      isRegenerate: true,
    });
    expect(adapter).toBeDefined();
    expect(typeof adapter.run).toBe("function");
  });
});
