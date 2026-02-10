import { eq, and, or, inArray, gt } from "drizzle-orm";
import { db } from "../db/client";
import { subscriptions, plans } from "../db/schema";

export interface Entitlements {
  planId: string;
  planName: string;
  inferenceRequestsLimit: number; // -1 = unlimited (private/enclave)
  byokInferenceRequestsLimit: number; // -1 = unlimited (BYOK)
  storageLimitMb: number; // -1 = unlimited
  maxEnclaves: number; // -1 = unlimited
  features: Record<string, boolean>;
  usageBasedBilling: boolean;
  dodoCustomerId: string | null;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  try {
    // Single JOIN query instead of two sequential queries (#14)
    const [result] = await db
      .select({
        planId: plans.id,
        planName: plans.name,
        inferenceRequestsLimit: plans.inferenceRequestsLimit,
        byokInferenceRequestsLimit: plans.byokInferenceRequestsLimit,
        storageLimitMb: plans.storageLimitMb,
        maxEnclaves: plans.maxEnclaves,
        features: plans.features,
        usageBasedBilling: subscriptions.usageBasedBilling,
        dodoCustomerId: subscriptions.dodoCustomerId,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          or(
            inArray(subscriptions.status, ["active", "trialing"]),
            // Cancelled users keep access until their paid period ends
            and(
              eq(subscriptions.status, "cancelled"),
              gt(subscriptions.currentPeriodEnd, new Date())
            )
          )
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
      byokInferenceRequestsLimit: result.byokInferenceRequestsLimit,
      storageLimitMb: result.storageLimitMb,
      maxEnclaves: result.maxEnclaves,
      features: (result.features as Record<string, boolean>) || {},
      usageBasedBilling: result.usageBasedBilling,
      dodoCustomerId: result.dodoCustomerId,
    };
  } catch (err) {
    // If billing tables don't exist yet, fall back to hardcoded free plan
    console.error("getEntitlements query failed, using hardcoded fallback:", err);
    return getHardcodedFreeEntitlements();
  }
}

// Hardcoded fallback — always reachable even if billing tables don't exist
function getHardcodedFreeEntitlements(): Entitlements {
  return {
    planId: "free",
    planName: "Free",
    inferenceRequestsLimit: -1,
    byokInferenceRequestsLimit: -1,
    storageLimitMb: -1,
    maxEnclaves: -1,
    features: {
      voiceCalls: true,
      voiceInput: true,
      prioritySupport: false,
      dedicatedEnclaves: false,
      customModels: false,
      customEndpoints: true,
      largeModels: false,
      priorityQueue: false,
    },
    usageBasedBilling: false,
    dodoCustomerId: null,
  };
}

// Cache the free plan entitlements to avoid repeated DB queries
let cachedFreeEntitlements: Entitlements | null = null;

async function getFreePlanEntitlements(): Promise<Entitlements> {
  if (cachedFreeEntitlements) return cachedFreeEntitlements;

  try {
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
        byokInferenceRequestsLimit: freePlan.byokInferenceRequestsLimit,
        storageLimitMb: freePlan.storageLimitMb,
        maxEnclaves: freePlan.maxEnclaves,
        features: (freePlan.features as Record<string, boolean>) || {},
        usageBasedBilling: false,
        dodoCustomerId: null,
      };
      return cachedFreeEntitlements;
    }
  } catch (err) {
    console.error("Failed to query free plan from DB, using hardcoded fallback:", err);
  }

  return getHardcodedFreeEntitlements();
}
