import { db } from "./client";
import { plans } from "./schema";
import { planData } from "./plan-data";
import { sql } from "drizzle-orm";

async function ensurePlansTable() {
  // Ensure the plans table exists before seeding.
  // This handles the case where Drizzle migrations were recorded as applied
  // but the tables weren't actually created (e.g. due to drizzle-kit push interference).
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
}

async function seed() {
  console.log("Seeding plans...");

  await ensurePlansTable();

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
