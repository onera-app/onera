import { describe, it, expect } from "bun:test";
import { db } from "../../db/client";
import { subscriptions, usageRecords } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { checkInferenceAllowance } from "../../billing/usage";
import { reportOverageEvent } from "../../billing/usage-reporting";

// Helper to set up a test user with a plan and optional usage billing
async function setupUser(
  planId: string,
  options: {
    status?: "active" | "trialing";
    usageBasedBilling?: boolean;
    dodoCustomerId?: string;
  } = {}
) {
  const userId = `test_${randomUUID()}`;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (planId !== "free") {
    await db.insert(subscriptions).values({
      id: randomUUID(),
      userId,
      planId,
      status: options.status ?? "active",
      billingInterval: "monthly",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      usageBasedBilling: options.usageBasedBilling ?? false,
      dodoCustomerId: options.dodoCustomerId ?? null,
    });
  }

  return { userId, periodStart, periodEnd };
}

// Helper to add usage records
async function addUsage(
  userId: string,
  count: number,
  periodStart: Date,
  periodEnd: Date,
  type: "inference_request" | "byok_inference_request" = "inference_request"
) {
  await db.insert(usageRecords).values({
    id: randomUUID(),
    userId,
    type,
    quantity: count,
    periodStart,
    periodEnd,
  });
}

describe("checkInferenceAllowance — usage-based billing", () => {
  it("should allow overage when usageBasedBilling is enabled and limit exceeded", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("starter", {
      usageBasedBilling: true,
      dodoCustomerId: "cus_test_123",
    });
    // Fill up to the limit (starter has 500 private inference requests)
    await addUsage(userId, 500, periodStart, periodEnd, "inference_request");

    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(true);
    expect(result.isOverage).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.used).toBe(501); // 500 existing + 1 overage
  });

  it("should block when usageBasedBilling is disabled and limit exceeded", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("starter", {
      usageBasedBilling: false,
    });
    await addUsage(userId, 500, periodStart, periodEnd, "inference_request");

    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(false);
    expect(result.isOverage).toBe(false);
    expect(result.upgradeRequired).toBe(true);
  });

  it("should not use overage for BYOK requests even with usage billing enabled", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free", {
      usageBasedBilling: true,
    });
    await addUsage(userId, 100, periodStart, periodEnd, "byok_inference_request");

    const result = await checkInferenceAllowance(userId, "byok");
    // Usage-based billing only applies to private inference
    expect(result.allowed).toBe(false);
    expect(result.isOverage).toBe(false);
  });

  it("should mark overage usage records with isOverage = true", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("starter", {
      usageBasedBilling: true,
      dodoCustomerId: "cus_test_456",
    });
    await addUsage(userId, 500, periodStart, periodEnd, "inference_request");

    await checkInferenceAllowance(userId, "private");

    const records = await db
      .select()
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          eq(usageRecords.isOverage, true)
        )
      );
    expect(records.length).toBe(1);
    expect(records[0].quantity).toBe(1);
  });

  it("should set isOverage = false for normal usage", async () => {
    const { userId } = await setupUser("starter", {
      usageBasedBilling: true,
    });

    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(true);
    expect(result.isOverage).toBe(false);

    const records = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId));
    expect(records.length).toBe(1);
    expect(records[0].isOverage).toBe(false);
  });
});

describe("reportOverageEvent — error handling", () => {
  it("should not throw when Dodo client is not configured", () => {
    // reportOverageEvent is fire-and-forget; should never throw
    expect(() => {
      reportOverageEvent("user_123", "cus_456", randomUUID());
    }).not.toThrow();
  });

  it("should not throw with empty customerId", () => {
    expect(() => {
      reportOverageEvent("user_123", "", randomUUID());
    }).not.toThrow();
  });
});
