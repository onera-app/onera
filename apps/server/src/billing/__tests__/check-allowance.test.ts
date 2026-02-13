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

describe("checkInferenceAllowance — private inference", () => {
  it("should allow free user with usage under limit", async () => {
    const { userId } = await setupUser("free");
    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(24); // 25 limit - 1 just recorded
    expect(result.inferenceType).toBe("private");
  });

  it("should deny free user who exceeded limit", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free");
    await addUsage(userId, 25, periodStart, periodEnd, "inference_request");
    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.upgradeRequired).toBe(true);
  });

  it("should allow pro user with high usage", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("pro");
    await addUsage(userId, 4999, periodStart, periodEnd, "inference_request");
    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0); // 5000 - 4999 - 1 = 0 remaining after this one
  });

  it("should deny team user who exceeded limit", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("team");
    await addUsage(userId, 999999, periodStart, periodEnd, "inference_request");
    const result = await checkInferenceAllowance(userId, "private");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should record usage when allowed", async () => {
    const { userId } = await setupUser("pro");
    await checkInferenceAllowance(userId, "private");

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
    await addUsage(userId, 25, periodStart, periodEnd, "inference_request");
    await checkInferenceAllowance(userId, "private");

    const records = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId));
    // Only the pre-existing record, no new one
    expect(records.length).toBe(1);
  });
});

describe("checkInferenceAllowance — BYOK inference", () => {
  it("should allow free user BYOK with usage under limit", async () => {
    const { userId } = await setupUser("free");
    const result = await checkInferenceAllowance(userId, "byok");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99); // 100 BYOK limit - 1 just recorded
    expect(result.inferenceType).toBe("byok");
  });

  it("should deny free user BYOK who exceeded limit", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free");
    await addUsage(userId, 100, periodStart, periodEnd, "byok_inference_request");
    const result = await checkInferenceAllowance(userId, "byok");
    expect(result.allowed).toBe(false);
    expect(result.upgradeRequired).toBe(true);
  });

  it("should track BYOK and private usage independently", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("free");
    // Fill up private inference to the limit
    await addUsage(userId, 25, periodStart, periodEnd, "inference_request");
    // BYOK should still work (separate counter)
    const result = await checkInferenceAllowance(userId, "byok");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99); // BYOK limit is 100
  });

  it("should allow unlimited BYOK for pro plan", async () => {
    const { userId, periodStart, periodEnd } = await setupUser("pro");
    await addUsage(userId, 999999, periodStart, periodEnd, "byok_inference_request");
    const result = await checkInferenceAllowance(userId, "byok");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(-1); // pro has unlimited BYOK
  });

  it("should record BYOK usage as byok_inference_request type", async () => {
    const { userId } = await setupUser("starter");
    await checkInferenceAllowance(userId, "byok");

    const records = await db
      .select()
      .from(usageRecords)
      .where(eq(usageRecords.userId, userId));
    expect(records.length).toBe(1);
    expect(records[0].type).toBe("byok_inference_request");
  });
});
