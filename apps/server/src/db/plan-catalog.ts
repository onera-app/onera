import { planData } from "./plan-data";

type CanonicalPlan = (typeof planData)[number];

const canonicalById = new Map<string, CanonicalPlan>(
  planData.map((plan) => [plan.id, plan]),
);

export function getCanonicalPlan(planId: string): CanonicalPlan | null {
  return canonicalById.get(planId) ?? null;
}

export function normalizePlanRow<T extends { id: string }>(plan: T | null): T | null {
  if (!plan) return null;
  const canonical = getCanonicalPlan(plan.id);
  if (!canonical) return plan;

  return {
    ...plan,
    name: canonical.name,
    description: canonical.description,
    tier: canonical.tier,
    monthlyPrice: canonical.monthlyPrice,
    yearlyPrice: canonical.yearlyPrice,
    inferenceRequestsLimit: canonical.inferenceRequestsLimit,
    byokInferenceRequestsLimit: canonical.byokInferenceRequestsLimit,
    storageLimitMb: canonical.storageLimitMb,
    maxEnclaves: canonical.maxEnclaves,
    features: canonical.features,
  } as T;
}
