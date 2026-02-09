import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock modules using the specifiers as they appear in webhook.ts
// (relative to webhook.ts's location: src/billing/)
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

mock.module("../../db/client", () => ({
  db: mockDb,
}));

mock.module("../dodo", () => ({
  dodoClient: null,
  DODO_WEBHOOK_KEY: "",
}));

// Dynamic import after mocks are registered
const { webhookApp } = await import("../webhook");

function makeRequest(body: string, headers?: Record<string, string>) {
  return new Request("http://localhost/dodo", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("Dodo Webhook Handler", () => {
  beforeEach(() => {
    // Reset mock call counts
    mockDb.update.mockClear();
    mockDb.set.mockClear();
    mockDb.where.mockClear();
    mockDb.insert.mockClear();
    mockDb.values.mockClear();
    mockDb.select.mockClear();
    mockDb.from.mockClear();
    mockDb.limit.mockClear();
  });

  it("should return 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: "not json",
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
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

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    // Should have called db.update for the subscription
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockDb.set).toHaveBeenCalled();
  });

  it("should return 200 for unhandled event types", async () => {
    const payload = {
      type: "unknown.event",
      data: {},
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    // Should NOT have called any db operations
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("should handle subscription.cancelled event", async () => {
    const payload = {
      type: "subscription.cancelled",
      data: { subscription_id: "sub_456" },
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should handle subscription.on_hold event", async () => {
    const payload = {
      type: "subscription.on_hold",
      data: { subscription_id: "sub_789" },
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should handle subscription.renewed event", async () => {
    const payload = {
      type: "subscription.renewed",
      data: {
        subscription_id: "sub_renew",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      },
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("should skip payment if dodoPaymentId is missing", async () => {
    const payload = {
      type: "payment.succeeded",
      data: {},
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    // No insert should happen for payment without ID
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("should handle payment.succeeded with idempotency check", async () => {
    // Mock that an invoice already exists for this payment
    (mockDb.limit as any).mockImplementationOnce(() => [{ id: "existing-invoice" }]);

    const payload = {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_123",
        customer_id: "user_abc",
        amount: 1999,
        currency: "USD",
      },
    };

    const res = await webhookApp.fetch(makeRequest(JSON.stringify(payload)));
    expect(res.status).toBe(200);
    // select was called (idempotency check), but insert should NOT be called
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
