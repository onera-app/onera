import { eq, and, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { subscriptions, plans } from "../db/schema";

export interface Entitlements {
  planId: string;
  planName: string;
  inferenceRequestsLimit: number; // -1 = unlimited
  storageLimitMb: number; // -1 = unlimited
  maxEnclaves: number; // -1 = unlimited
  features: Record<string, boolean>;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  // Single JOIN query instead of two sequential queries (#14)
  const [result] = await db
    .select({
      planId: plans.id,
      planName: plans.name,
      inferenceRequestsLimit: plans.inferenceRequestsLimit,
      storageLimitMb: plans.storageLimitMb,
      maxEnclaves: plans.maxEnclaves,
      features: plans.features,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.status, ["active", "trialing"])
      )
    )
    .limit(1);

  if (!result) {
    // Fall back to the free plan from the database (#13)
    return getFreePlanEntitlements();
  }

  return {
    planId: result.planId,
    planName: result.planName,
    inferenceRequestsLimit: result.inferenceRequestsLimit,
    storageLimitMb: result.storageLimitMb,
    maxEnclaves: result.maxEnclaves,
    features: (result.features as Record<string, boolean>) || {},
  };
}

// Cache the free plan entitlements to avoid repeated DB queries
let cachedFreeEntitlements: Entitlements | null = null;

async function getFreePlanEntitlements(): Promise<Entitlements> {
  if (cachedFreeEntitlements) return cachedFreeEntitlements;

  const [freePlan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, "free"))
    .limit(1);

  if (freePlan) {
    cachedFreeEntitlements = {
      planId: freePlan.id,
      planName: freePlan.name,
      inferenceRequestsLimit: freePlan.inferenceRequestsLimit,
      storageLimitMb: freePlan.storageLimitMb,
      maxEnclaves: freePlan.maxEnclaves,
      features: (freePlan.features as Record<string, boolean>) || {},
    };
    return cachedFreeEntitlements;
  }

  // Hardcoded fallback only if the free plan doesn't exist in the database yet
  return {
    planId: "free",
    planName: "Free",
    inferenceRequestsLimit: 25,
    storageLimitMb: 100,
    maxEnclaves: 0,
    features: {
      voiceCalls: false,
      voiceInput: false,
      prioritySupport: false,
      dedicatedEnclaves: false,
      customModels: false,
      customEndpoints: false,
      largeModels: false,
      priorityQueue: false,
    },
  };
}
