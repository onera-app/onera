import { db } from "../db/client";
import { usageRecords, subscriptions } from "../db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getEntitlements } from "./entitlements";
import { randomUUID } from "crypto";

export type InferenceType = "private" | "byok";

export interface InferenceAllowanceResult {
  allowed: boolean;
  remaining: number; // -1 = unlimited
  limit: number; // -1 = unlimited
  used: number;
  upgradeRequired: boolean;
  planId: string;
  inferenceType: InferenceType;
}

// Map inference type to usage record type
const usageTypeMap: Record<InferenceType, "inference_request" | "byok_inference_request"> = {
  private: "inference_request",
  byok: "byok_inference_request",
};

/**
 * Check if user can make an inference request.
 * If allowed, atomically records the usage.
 *
 * @param inferenceType - "private" for enclave inference, "byok" for bring-your-own-key
 */
export async function checkInferenceAllowance(
  userId: string,
  inferenceType: InferenceType = "private"
): Promise<InferenceAllowanceResult> {
  const entitlements = await getEntitlements(userId);
  const usageType = usageTypeMap[inferenceType];
  const limit = inferenceType === "byok"
    ? entitlements.byokInferenceRequestsLimit
    : entitlements.inferenceRequestsLimit;

  // Unlimited plan — always allow
  if (limit === -1) {
    await recordUsage(userId, usageType);
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      used: 0, // not tracked for unlimited
      upgradeRequired: false,
      planId: entitlements.planId,
      inferenceType,
    };
  }

  // Get current period boundaries
  const { periodStart, periodEnd } = await getCurrentPeriod(userId);

  // Use transaction to atomically check usage and record if allowed
  return db.transaction(async (tx) => {
    // Count current usage for this period
    const [result] = await tx
      .select({
        total: sql<number>`COALESCE(sum(${usageRecords.quantity}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, userId),
          eq(usageRecords.type, usageType),
          gte(usageRecords.periodStart, periodStart),
          lte(usageRecords.periodEnd, periodEnd)
        )
      );

    const used = Number(result?.total) || 0;

    if (used >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        used,
        upgradeRequired: true,
        planId: entitlements.planId,
        inferenceType,
      };
    }

    // Record this usage within the same transaction
    await tx.insert(usageRecords).values({
      id: randomUUID(),
      userId,
      type: usageType,
      quantity: 1,
      periodStart,
      periodEnd,
    });

    return {
      allowed: true,
      remaining: limit - used - 1,
      limit,
      used: used + 1,
      upgradeRequired: false,
      planId: entitlements.planId,
      inferenceType,
    };
  });
}

/**
 * Get the current billing period for a user.
 * Falls back to calendar month if no subscription.
 */
async function getCurrentPeriod(userId: string): Promise<{ periodStart: Date; periodEnd: Date }> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const now = new Date();
  return {
    periodStart: sub?.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1),
    periodEnd: sub?.currentPeriodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/**
 * Record a single usage event.
 */
async function recordUsage(
  userId: string,
  type: "inference_request" | "byok_inference_request" | "storage_mb",
  periodStart?: Date,
  periodEnd?: Date
): Promise<void> {
  if (!periodStart || !periodEnd) {
    const period = await getCurrentPeriod(userId);
    periodStart = period.periodStart;
    periodEnd = period.periodEnd;
  }

  await db.insert(usageRecords).values({
    id: randomUUID(),
    userId,
    type,
    quantity: 1,
    periodStart,
    periodEnd,
  });
}

export { recordUsage, getCurrentPeriod };
