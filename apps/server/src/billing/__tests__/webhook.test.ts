import { describe, it, expect, mock } from "bun:test";

// Mock modules using the specifiers as they appear in webhook.ts
// (relative to webhook.ts's location: src/billing/)
mock.module("../../db/client", () => {
  const mockDb = {
    update: mock(() => mockDb),
    set: mock(() => mockDb),
    where: mock(() => mockDb),
    returning: mock(() => []),
    insert: mock(() => mockDb),
    values: mock(() => mockDb),
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    limit: mock(() => []),
  };
  return { db: mockDb };
});

mock.module("../dodo", () => ({
  dodoClient: null,
  DODO_WEBHOOK_KEY: "",
}));

// Dynamic import after mocks are registered
const { webhookApp } = await import("../webhook");

describe("Dodo Webhook Handler", () => {
  it("should return 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: "not json",
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(400);
  });

  it("should return 200 for valid subscription.active event", async () => {
    const payload = {
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      },
    };

    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(200);
  });

  it("should return 200 for unhandled event types", async () => {
    const payload = {
      type: "unknown.event",
      data: {},
    };

    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(200);
  });
});
