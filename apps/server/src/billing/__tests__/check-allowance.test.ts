import { describe, it, expect } from "bun:test";
import { db } from "../../db/client";
import { subscriptions, usageRecords } from "../../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { checkInferenceAllowance } from "../../billing/usage";

// Helper to set up a test user with a plan
async function setupUser(planId: string, status: "active" | "trialing" = "active") {
  const userId = `test_${randomUUID()}`;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (planId !== "free") {
    await db.insert(subscriptions).values({
      id: randomUUID(),
      userId,
      planId,
      status,
      billingInterval: "monthly",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });
  }

  return { userId, periodStart, periodEnd };
}

// Helper to add usage records
async function addUsage(userId: string, count: number, periodStart: Date, periodEnd: Date) {
  await db.insert(usageRecords).values({
    id: randomUUID(),
    userId,
    type: "inference_request",
    quantity: count,
    periodStart,
    periodEnd,
  });
}

describe("checkInferenceAllowance", () => {
  it("should allow free user with usage under limit", async () => {
    const { userId } = await setupUser("free");
    const result = await checkInferenceAllowance(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(24); // 25 limit - 1 just recorded
  });

  it("should deny free user who exceeded limit", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free");
    await addUsage(userId, 25, periodStart, periodEnd);
    const result = await checkInferenceAllowance(userId);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.upgradeRequired).toBe(true);
  });

  it("should allow pro user with high usage", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("pro");
    await addUsage(userId, 4999, periodStart, periodEnd);
    const result = await checkInferenceAllowance(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // 5000 - 4999 - 1 = 0 remaining after this one
  });

  it("should allow unlimited plan with any usage", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("privacy_max");
    await addUsage(userId, 999999, periodStart, periodEnd);
    const result = await checkInferenceAllowance(userId);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1); // unlimited
  });

  it("should record usage when allowed", async () => {
    const { userId } = await setupUser("pro");
    await checkInferenceAllowance(userId);

    // Verify a usage record was created
    const records = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId));
    expect(records.length).toBe(1);
    expect(records[0].type).toBe("inference_request");
    expect(records[0].quantity).toBe(1);
  });

  it("should NOT record usage when denied", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free");
    await addUsage(userId, 25, periodStart, periodEnd);
    await checkInferenceAllowance(userId);

    const records = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId));
    // Only the pre-existing record, no new one
    expect(records.length).toBe(1);
  });
});
