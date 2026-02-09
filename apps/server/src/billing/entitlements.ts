import { eq } from "drizzle-orm";
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

// Default free plan entitlements (when no subscription exists)
const FREE_ENTITLEMENTS: Entitlements = {
  planId: "free",
  planName: "Free",
  inferenceRequestsLimit: 50,
  storageLimitMb: 100,
  maxEnclaves: 0,
  features: {
    voiceCalls: false,
    prioritySupport: false,
    dedicatedEnclaves: false,
    customModels: false,
  },
};

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub || sub.status !== "active") {
    return FREE_ENTITLEMENTS;
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, sub.planId))
    .limit(1);

  if (!plan) {
    return FREE_ENTITLEMENTS;
  }

  return {
    planId: plan.id,
    planName: plan.name,
    inferenceRequestsLimit: plan.inferenceRequestsLimit,
    storageLimitMb: plan.storageLimitMb,
    maxEnclaves: plan.maxEnclaves,
    features: (plan.features as Record<string, boolean>) || {},
  };
}
