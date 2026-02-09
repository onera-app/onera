import { db } from "./client";
import { plans } from "./schema";

const seedPlans = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic AI chat features",
    monthlyPrice: 0,
    yearlyPrice: 0,
    inferenceRequestsLimit: 50,
    storageLimitMb: 100,
    maxEnclaves: 0,
    features: {
      voiceCalls: false,
      prioritySupport: false,
      dedicatedEnclaves: false,
      customModels: false,
    },
    dodoPriceIdMonthly: null,
    dodoPriceIdYearly: null,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For power users who need more capacity and privacy",
    monthlyPrice: 2000, // $20/mo
    yearlyPrice: 19200, // $192/yr ($16/mo)
    inferenceRequestsLimit: 1000,
    storageLimitMb: 5000,
    maxEnclaves: 2,
    features: {
      voiceCalls: true,
      prioritySupport: false,
      dedicatedEnclaves: true,
      customModels: false,
    },
    dodoPriceIdMonthly: "pdt_0NY6NccyasPmnImIkbocM",
    dodoPriceIdYearly: "pdt_0NY6Nj9gnxfrsiUrxrlI1",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Unlimited access with priority support and custom enclaves",
    monthlyPrice: 10000, // $100/mo
    yearlyPrice: 96000, // $960/yr ($80/mo)
    inferenceRequestsLimit: -1, // unlimited
    storageLimitMb: -1, // unlimited
    maxEnclaves: -1, // unlimited
    features: {
      voiceCalls: true,
      prioritySupport: true,
      dedicatedEnclaves: true,
      customModels: true,
    },
    dodoPriceIdMonthly: "pdt_0NY6Nqvklb7ueLbSB4FCz",
    dodoPriceIdYearly: "pdt_0NY6O27jrS1W7Xfz9PLma",
  },
];

async function seed() {
  console.log("Seeding plans...");

  for (const plan of seedPlans) {
    await db
      .insert(plans)
      .values(plan)
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          name: plan.name,
          description: plan.description,
          monthlyPrice: plan.monthlyPrice,
          yearlyPrice: plan.yearlyPrice,
          inferenceRequestsLimit: plan.inferenceRequestsLimit,
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
