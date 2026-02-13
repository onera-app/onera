import { db } from "./client";
import { plans } from "./schema";
import { planData } from "./plan-data";
import { sql } from "drizzle-orm";
import DodoPayments from "dodopayments";

type BillingInterval = "monthly" | "yearly";

interface PlanSeedRecord {
  id: string;
  name: string;
  description: string;
  tier: number;
  monthlyPrice: number;
  yearlyPrice: number;
  inferenceRequestsLimit: number;
  byokInferenceRequestsLimit: number;
  storageLimitMb: number;
  maxEnclaves: number;
  features: Record<string, boolean>;
  dodoPriceIdMonthly: string | null;
  dodoPriceIdYearly: string | null;
}

function buildPlanProductEnvVarName(
  planId: string,
  interval: BillingInterval,
): string {
  const normalizedPlanId = planId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const normalizedInterval = interval.toUpperCase();
  return `DODO_PLAN_${normalizedPlanId}_${normalizedInterval}_PRODUCT_ID`;
}

function getPlanProductFromEnv(
  planId: string,
  interval: BillingInterval,
): string | null {
  const envVar = buildPlanProductEnvVarName(planId, interval);
  const value = process.env[envVar]?.trim();
  return value && value.length > 0 ? value : null;
}

function inferIntervalFromProduct(
  product: DodoPayments.ProductListResponse,
): BillingInterval | null {
  const detail = product.price_detail;
  if (!detail) return null;

  if (detail.type !== "recurring_price" && detail.type !== "usage_based_price") {
    return null;
  }

  // Match standard monthly billing cadence.
  if (
    detail.payment_frequency_interval === "Month" &&
    detail.payment_frequency_count === 1
  ) {
    return "monthly";
  }

  // Match standard yearly billing cadence.
  if (
    (detail.payment_frequency_interval === "Year" &&
      detail.payment_frequency_count === 1) ||
    (detail.payment_frequency_interval === "Month" &&
      detail.payment_frequency_count === 12)
  ) {
    return "yearly";
  }

  return null;
}

function inferPlanIdFromProduct(
  product: DodoPayments.ProductListResponse,
): string | null {
  const metadata = product.metadata || {};
  return (
    metadata.planId ||
    metadata.plan_id ||
    metadata.plan ||
    metadata.tier_id ||
    null
  );
}

async function resolvePlanDataWithDodoProducts(
  basePlans: PlanSeedRecord[],
): Promise<PlanSeedRecord[]> {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) {
    console.log(
      "DODO_PAYMENTS_API_KEY not set. Seeding plans with static Dodo product IDs.",
    );
    return basePlans;
  }

  const dodo = new DodoPayments({
    bearerToken: apiKey,
    environment:
      process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
  });

  const planIds = new Set(basePlans.map((plan) => plan.id));
  const discoveredByPlan = new Map<
    string,
    Partial<Record<BillingInterval, string>>
  >();

  for await (const product of dodo.products.list({ recurring: true })) {
    const planId = inferPlanIdFromProduct(product);
    if (!planId || !planIds.has(planId)) continue;

    const interval = inferIntervalFromProduct(product);
    if (!interval) continue;

    const byInterval = discoveredByPlan.get(planId) ?? {};
    const existing = byInterval[interval];
    if (existing && existing !== product.product_id) {
      throw new Error(
        `Multiple Dodo products found for plan=${planId}, interval=${interval}: ${existing}, ${product.product_id}`,
      );
    }

    byInterval[interval] = product.product_id;
    discoveredByPlan.set(planId, byInterval);
  }

  return basePlans.map((plan) => {
    const discovered = discoveredByPlan.get(plan.id) ?? {};

    const monthly =
      getPlanProductFromEnv(plan.id, "monthly") ??
      discovered.monthly ??
      plan.dodoPriceIdMonthly;

    const yearly =
      getPlanProductFromEnv(plan.id, "yearly") ??
      discovered.yearly ??
      plan.dodoPriceIdYearly;

    // Paid plans should always have both monthly and yearly Dodo product IDs.
    if ((plan.monthlyPrice > 0 || plan.yearlyPrice > 0) && (!monthly || !yearly)) {
      throw new Error(
        `Missing Dodo product mapping for paid plan '${plan.id}'. ` +
          `Set product metadata (planId/plan_id) for monthly/yearly products, ` +
          `or provide overrides with ${buildPlanProductEnvVarName(plan.id, "monthly")} and ${buildPlanProductEnvVarName(plan.id, "yearly")}.`,
      );
    }

    return {
      ...plan,
      dodoPriceIdMonthly: monthly,
      dodoPriceIdYearly: yearly,
    };
  });
}

async function ensureBillingTables() {
  // Ensure all billing tables exist before seeding.
  // This handles the case where Drizzle migrations were recorded as applied
  // but the tables weren't actually created (e.g. due to drizzle-kit push interference).
  console.log("Ensuring billing tables exist...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "plans" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "description" text NOT NULL,
      "monthly_price" integer NOT NULL,
      "yearly_price" integer NOT NULL,
      "inference_requests_limit" integer NOT NULL,
      "byok_inference_requests_limit" integer NOT NULL DEFAULT -1,
      "storage_limit_mb" integer NOT NULL,
      "max_enclaves" integer NOT NULL,
      "features" jsonb NOT NULL,
      "tier" integer NOT NULL DEFAULT 0,
      "dodo_price_id_monthly" text,
      "dodo_price_id_yearly" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "subscriptions" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "plan_id" text NOT NULL REFERENCES "plans"("id"),
      "dodo_subscription_id" text,
      "dodo_customer_id" text,
      "status" text NOT NULL,
      "billing_interval" text NOT NULL,
      "current_period_start" timestamp,
      "current_period_end" timestamp,
      "pending_plan_id" text REFERENCES "plans"("id"),
      "pending_billing_interval" text,
      "usage_based_billing" boolean NOT NULL DEFAULT false,
      "dodo_usage_subscription_id" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions" USING btree ("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" USING btree ("status")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_subscriptions_dodo_subscription_id" ON "subscriptions" USING btree ("dodo_subscription_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "invoices" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "subscription_id" text REFERENCES "subscriptions"("id") ON DELETE SET NULL,
      "dodo_payment_id" text,
      "amount_cents" integer NOT NULL,
      "currency" text DEFAULT 'USD' NOT NULL,
      "status" text NOT NULL,
      "description" text,
      "paid_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_invoices_user_id" ON "invoices" USING btree ("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_invoices_subscription_id" ON "invoices" USING btree ("subscription_id")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_dodo_payment_id" ON "invoices" USING btree ("dodo_payment_id") WHERE "dodo_payment_id" IS NOT NULL`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "usage_records" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "type" text NOT NULL,
      "quantity" integer NOT NULL,
      "is_overage" boolean NOT NULL DEFAULT false,
      "period_start" timestamp NOT NULL,
      "period_end" timestamp NOT NULL,
      "recorded_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_usage_records_user_id" ON "usage_records" USING btree ("user_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_usage_records_user_period" ON "usage_records" USING btree ("user_id", "type", "period_start", "period_end")`);

  console.log("Billing tables verified.");
}

async function seed() {
  console.log("Seeding plans...");

  await ensureBillingTables();

  const resolvedPlanData = await resolvePlanDataWithDodoProducts(
    planData as PlanSeedRecord[],
  );

  for (const plan of resolvedPlanData) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          name: plan.name,
          description: plan.description,
          tier: plan.tier,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          inferenceRequestsLimit: plan.inferenceRequestsLimit,
          byokInferenceRequestsLimit: plan.byokInferenceRequestsLimit,
          storageLimitMb: plan.storageLimitMb,
          maxEnclaves: plan.maxEnclaves,
          features: plan.features,
          dodoPriceIdMonthly: plan.dodoPriceIdMonthly,
          dodoPriceIdYearly: plan.dodoPriceIdYearly,
          updatedAt: new Date(),
        },
      });
    console.log(
      `  Seeded plan: ${plan.id} (monthly=${plan.dodoPriceIdMonthly ?? "n/a"}, yearly=${plan.dodoPriceIdYearly ?? "n/a"})`,
    );
  }

  console.log("Plans seeded!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
