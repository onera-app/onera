import { db } from "./client";
import { plans } from "./schema";
import { planData } from "./plan-data";

async function seed() {
  console.log("Seeding plans...");

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
