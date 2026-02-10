import { db } from "./client";
import { plans } from "./schema";
import { planData } from "./plan-data";
import { sql } from "drizzle-orm";

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

  for (const plan of planData) {
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
    console.log(`  Seeded plan: ${plan.id}`);
  }

  console.log("Plans seeded!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
