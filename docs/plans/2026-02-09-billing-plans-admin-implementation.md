# Billing, Plans & Admin Control Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hybrid billing (subscriptions + usage metering) via Dodo Payments, with 3 plan tiers (Free/Pro/Enterprise), user-facing billing management, and an admin control panel.

**Architecture:** Dodo Payments as Merchant of Record, webhook-driven subscription state synced to local PostgreSQL via Drizzle ORM, Clerk `publicMetadata.role` for admin access, entitlement middleware on tRPC to enforce plan limits.

**Tech Stack:** Hono, tRPC, Drizzle ORM, PostgreSQL, `@dodopayments/sdk`, Clerk, React 19, TanStack Router, Tailwind CSS, Radix UI, Zustand.

---

## Task 1: Install Dodo Payments SDK

**Files:**
- Modify: `apps/server/package.json`

**Step 1: Install the SDK**

Run:
```bash
cd apps/server && bun add dodopayments
```

**Step 2: Verify installation**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No new errors.

**Step 3: Commit**

```bash
git add apps/server/package.json apps/server/bun.lockb
git commit -m "chore: add dodopayments SDK dependency"
```

---

## Task 2: Database Schema — Billing Tables

**Files:**
- Create: `apps/server/src/db/schema/billing.ts`
- Modify: `apps/server/src/db/schema.ts` (add re-export)
- Modify: `apps/server/src/db/client.ts` (add convenience re-exports)

**Step 1: Create the billing schema file**

Create `apps/server/src/db/schema/billing.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Plans ---

export const plans = pgTable("plans", {
  id: text("id").primaryKey(), // 'free', 'pro', 'enterprise'
  name: text("name").notNull(),
  description: text("description").notNull(),
  monthlyPrice: integer("monthly_price").notNull(), // cents
  yearlyPrice: integer("yearly_price").notNull(), // cents
  inferenceRequestsLimit: integer("inference_requests_limit").notNull(), // -1 = unlimited
  storageLimitMb: integer("storage_limit_mb").notNull(),
  maxEnclaves: integer("max_enclaves").notNull(),
  features: jsonb("features").$type<Record<string, boolean>>().notNull(),
  dodoPriceIdMonthly: text("dodo_price_id_monthly"),
  dodoPriceIdYearly: text("dodo_price_id_yearly"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// --- Subscriptions ---

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // UUID generated in app
    userId: text("user_id").notNull(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    dodoSubscriptionId: text("dodo_subscription_id"),
    dodoCustomerId: text("dodo_customer_id"),
    status: text("status")
      .notNull()
      .$type<"active" | "on_hold" | "cancelled" | "trialing" | "expired">(),
    billingInterval: text("billing_interval")
      .notNull()
      .$type<"monthly" | "yearly" | "none">(),
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_subscriptions_user_id").on(table.userId),
    index("idx_subscriptions_status").on(table.status),
    index("idx_subscriptions_dodo_subscription_id").on(
      table.dodoSubscriptionId
    ),
  ]
);

// --- Invoices ---

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    dodoPaymentId: text("dodo_payment_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status")
      .notNull()
      .$type<"succeeded" | "failed" | "refunded">(),
    description: text("description"),
    paidAt: timestamp("paid_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_invoices_user_id").on(table.userId),
    index("idx_invoices_subscription_id").on(table.subscriptionId),
  ]
);

// --- Usage Records ---

export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull().$type<"inference_request" | "storage_mb">(),
    quantity: integer("quantity").notNull(),
    periodStart: timestamp("period_start", { mode: "date" }).notNull(),
    periodEnd: timestamp("period_end", { mode: "date" }).notNull(),
    recordedAt: timestamp("recorded_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_usage_records_user_id").on(table.userId),
    index("idx_usage_records_user_period").on(
      table.userId,
      table.type,
      table.periodStart,
      table.periodEnd
    ),
  ]
);

// Type exports
export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type NewUsageRecord = typeof usageRecords.$inferInsert;
```

**Step 2: Add re-export to main schema**

In `apps/server/src/db/schema.ts`, add at the bottom alongside the existing re-exports:

```typescript
export * from './schema/billing';
```

**Step 3: Add convenience re-exports to client**

In `apps/server/src/db/client.ts`, add to the destructured re-exports from schema:

Add `plans`, `subscriptions`, `invoices`, `usageRecords` to the existing re-export block. The exact edit depends on the current destructuring — add them to the `export const { ... } = schema;` line.

**Step 4: Generate migration**

Run:
```bash
cd apps/server && bun run db:generate
```
Expected: A new migration file created in `drizzle/migrations/`.

**Step 5: Run migration**

Run:
```bash
cd apps/server && bun run db:migrate
```
Expected: "Migrations complete!"

**Step 6: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 7: Commit**

```bash
git add apps/server/src/db/schema/billing.ts apps/server/src/db/schema.ts apps/server/src/db/client.ts apps/server/drizzle/
git commit -m "feat: add billing database schema (plans, subscriptions, invoices, usage_records)"
```

---

## Task 3: Seed Plans Data

**Files:**
- Create: `apps/server/src/db/seed-plans.ts`
- Modify: `apps/server/package.json` (add seed script)

**Step 1: Create seed script**

Create `apps/server/src/db/seed-plans.ts`:

```typescript
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
    dodoPriceIdMonthly: null, // Set after creating products in Dodo dashboard
    dodoPriceIdYearly: null,
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
    dodoPriceIdMonthly: null,
    dodoPriceIdYearly: null,
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
```

**Step 2: Add script to package.json**

In `apps/server/package.json`, add to `"scripts"`:

```json
"db:seed-plans": "bun run src/db/seed-plans.ts"
```

**Step 3: Run seed**

Run:
```bash
cd apps/server && bun run db:seed-plans
```
Expected: "Plans seeded!"

**Step 4: Commit**

```bash
git add apps/server/src/db/seed-plans.ts apps/server/package.json
git commit -m "feat: add plans seed data (free, pro, enterprise)"
```

---

## Task 4: Dodo Payments Client Setup

**Files:**
- Create: `apps/server/src/billing/dodo.ts`

**Step 1: Create the Dodo client module**

Create `apps/server/src/billing/dodo.ts`:

```typescript
import DodoPayments from "dodopayments";

const apiKey = process.env.DODO_PAYMENTS_API_KEY;

if (!apiKey) {
  console.warn(
    "DODO_PAYMENTS_API_KEY not set — billing features will be unavailable"
  );
}

export const dodoClient = apiKey
  ? new DodoPayments({
      bearerToken: apiKey,
      environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
    })
  : null;

export const DODO_WEBHOOK_KEY = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "";

/**
 * Get the Dodo client, throwing if not configured.
 * Use this in billing routes that require the client.
 */
export function requireDodoClient(): DodoPayments {
  if (!dodoClient) {
    throw new Error("Billing is not configured. DODO_PAYMENTS_API_KEY is missing.");
  }
  return dodoClient;
}
```

**Step 2: Add env vars to .env.example**

In `apps/server/.env.example`, add:

```env
# Billing (Dodo Payments)
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_SECRET=
```

**Step 3: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors (or only the existing DodoPayments import warning if types aren't available — check and resolve).

**Step 4: Commit**

```bash
git add apps/server/src/billing/dodo.ts apps/server/.env.example
git commit -m "feat: add Dodo Payments client setup"
```

---

## Task 5: Webhook Endpoint

**Files:**
- Create: `apps/server/src/billing/webhook.ts`
- Modify: `apps/server/src/index.ts` (mount webhook route)

**Step 1: Create webhook handler**

Create `apps/server/src/billing/webhook.ts`:

```typescript
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { subscriptions, invoices } from "../db/schema";
import { dodoClient, DODO_WEBHOOK_KEY } from "./dodo";
import { randomUUID } from "crypto";

export const webhookApp = new Hono();

interface WebhookPayload {
  type: string;
  data: Record<string, any>;
}

webhookApp.post("/dodo", async (c) => {
  const rawBody = await c.req.text();

  // Verify webhook signature
  if (dodoClient && DODO_WEBHOOK_KEY) {
    const webhookHeaders = {
      "webhook-id": c.req.header("webhook-id") || "",
      "webhook-signature": c.req.header("webhook-signature") || "",
      "webhook-timestamp": c.req.header("webhook-timestamp") || "",
    };

    try {
      dodoClient.webhooks.unwrap(rawBody, { headers: webhookHeaders });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const { type, data } = payload;
  console.log(`Webhook received: ${type}`);

  try {
    switch (type) {
      case "subscription.active": {
        await handleSubscriptionActive(data);
        break;
      }
      case "subscription.updated": {
        await handleSubscriptionUpdated(data);
        break;
      }
      case "subscription.on_hold": {
        await handleSubscriptionStatusChange(data, "on_hold");
        break;
      }
      case "subscription.cancelled": {
        await handleSubscriptionStatusChange(data, "cancelled");
        break;
      }
      case "subscription.expired": {
        await handleSubscriptionStatusChange(data, "expired");
        break;
      }
      case "subscription.renewed": {
        await handleSubscriptionRenewed(data);
        break;
      }
      case "payment.succeeded": {
        await handlePayment(data, "succeeded");
        break;
      }
      case "payment.failed": {
        await handlePayment(data, "failed");
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${type}`);
    }
  } catch (error) {
    console.error(`Error processing webhook ${type}:`, error);
    return c.json({ error: "Processing failed" }, 500);
  }

  return c.json({ received: true });
});

async function handleSubscriptionActive(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart: data.current_period_start
        ? new Date(data.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: data.current_period_end
        ? new Date(data.current_period_end * 1000)
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionUpdated(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (data.status) updates.status = data.status;
  if (data.current_period_start)
    updates.currentPeriodStart = new Date(data.current_period_start * 1000);
  if (data.current_period_end)
    updates.currentPeriodEnd = new Date(data.current_period_end * 1000);

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionStatusChange(
  data: Record<string, any>,
  status: "on_hold" | "cancelled" | "expired"
) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  await db
    .update(subscriptions)
    .set({ status, updatedAt: new Date() })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handleSubscriptionRenewed(data: Record<string, any>) {
  const dodoSubId = data.subscription_id || data.id;
  if (!dodoSubId) return;

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodStart: data.current_period_start
        ? new Date(data.current_period_start * 1000)
        : undefined,
      currentPeriodEnd: data.current_period_end
        ? new Date(data.current_period_end * 1000)
        : undefined,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubId));
}

async function handlePayment(
  data: Record<string, any>,
  status: "succeeded" | "failed"
) {
  const dodoPaymentId = data.payment_id || data.id;
  if (!dodoPaymentId) return;

  // Find the subscription for this payment
  const dodoSubId = data.subscription_id;
  let subscriptionId: string | null = null;

  if (dodoSubId) {
    const [sub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.dodoSubscriptionId, dodoSubId))
      .limit(1);
    subscriptionId = sub?.id || null;
  }

  // Find userId from subscription or data
  let userId = data.customer_id || data.metadata?.userId;
  if (!userId && subscriptionId) {
    const [sub] = await db
      .select({ userId: subscriptions.userId })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    userId = sub?.userId;
  }

  if (!userId) {
    console.warn("Payment webhook missing userId, skipping invoice creation");
    return;
  }

  await db.insert(invoices).values({
    id: randomUUID(),
    userId,
    subscriptionId,
    dodoPaymentId,
    amountCents: data.amount || 0,
    currency: data.currency || "USD",
    status,
    description: data.description || `Payment ${status}`,
    paidAt: status === "succeeded" ? new Date() : null,
  });
}
```

**Step 2: Mount webhook route in server**

In `apps/server/src/index.ts`, add the import at the top with other imports:

```typescript
import { webhookApp } from "./billing/webhook";
```

Then mount it before the tRPC routes (after the health check, before `app.use("/trpc/*", ...)`):

```typescript
// Dodo Payments webhook endpoint
app.route("/webhooks", webhookApp);
```

**Step 3: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/server/src/billing/webhook.ts apps/server/src/index.ts
git commit -m "feat: add Dodo Payments webhook handler"
```

---

## Task 6: Admin Procedure Middleware

**Files:**
- Modify: `apps/server/src/trpc/trpc.ts`

**Step 1: Add admin middleware**

In `apps/server/src/trpc/trpc.ts`, add after the existing `protectedProcedure`:

```typescript
import { getUserMetadata } from "../auth/clerk";

/**
 * Middleware to require admin role
 * Checks Clerk publicMetadata.role === "admin"
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const metadata = await getUserMetadata(ctx.user.id);
  if (!metadata || metadata.publicMetadata?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as AuthedContext,
  });
});

/**
 * Admin procedure that requires admin role
 * Use this for admin-only endpoints
 */
export const adminProcedure = t.procedure.use(isAdmin);
```

**Step 2: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 3: Commit**

```bash
git add apps/server/src/trpc/trpc.ts
git commit -m "feat: add adminProcedure middleware with Clerk role check"
```

---

## Task 7: Billing tRPC Router

**Files:**
- Create: `apps/server/src/trpc/routers/billing.ts`
- Modify: `apps/server/src/trpc/index.ts` (register router)

**Step 1: Create billing router**

Create `apps/server/src/trpc/routers/billing.ts`:

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../../db/client";
import { plans, subscriptions, invoices, usageRecords } from "../../db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireDodoClient } from "../../billing/dodo";
import { randomUUID } from "crypto";

export const billingRouter = router({
  // List available plans
  getPlans: protectedProcedure.query(async () => {
    return db.select().from(plans).orderBy(plans.monthlyPrice);
  }),

  // Get current user's subscription
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!subscription) {
      // Return free plan defaults
      const [freePlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, "free"))
        .limit(1);

      return {
        subscription: null,
        plan: freePlan || null,
      };
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.planId))
      .limit(1);

    return {
      subscription: {
        ...subscription,
        createdAt: subscription.createdAt.getTime(),
        updatedAt: subscription.updatedAt.getTime(),
        currentPeriodStart: subscription.currentPeriodStart?.getTime() ?? null,
        currentPeriodEnd: subscription.currentPeriodEnd?.getTime() ?? null,
      },
      plan: plan || null,
    };
  }),

  // Create checkout session for a plan
  createCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingInterval: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dodo = requireDodoClient();

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      if (plan.id === "free") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot checkout for free plan",
        });
      }

      const priceId =
        input.billingInterval === "monthly"
          ? plan.dodoPriceIdMonthly
          : plan.dodoPriceIdYearly;

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Plan pricing not configured in Dodo",
        });
      }

      // Create Dodo subscription checkout
      const checkout = await dodo.subscriptions.create({
        product_id: priceId,
        customer: {
          email: ctx.user.email,
          name: ctx.user.name,
        },
        metadata: {
          userId: ctx.user.id,
          planId: plan.id,
          billingInterval: input.billingInterval,
        },
        payment_link: true,
      });

      // Create a pending subscription record
      const existingSub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (existingSub.length === 0) {
        await db.insert(subscriptions).values({
          id: randomUUID(),
          userId: ctx.user.id,
          planId: plan.id,
          dodoSubscriptionId: checkout.subscription_id,
          dodoCustomerId: checkout.customer?.customer_id ?? null,
          status: "trialing",
          billingInterval: input.billingInterval,
        });
      } else {
        await db
          .update(subscriptions)
          .set({
            planId: plan.id,
            dodoSubscriptionId: checkout.subscription_id,
            dodoCustomerId: checkout.customer?.customer_id ?? null,
            billingInterval: input.billingInterval,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, ctx.user.id));
      }

      return {
        url: checkout.payment_link,
        subscriptionId: checkout.subscription_id,
      };
    }),

  // Change plan (upgrade/downgrade)
  changePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingInterval: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dodo = requireDodoClient();

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!currentSub?.dodoSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription to change",
        });
      }

      // Get target plan
      const [targetPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!targetPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const priceId =
        input.billingInterval === "monthly"
          ? targetPlan.dodoPriceIdMonthly
          : targetPlan.dodoPriceIdYearly;

      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Target plan pricing not configured",
        });
      }

      // Use Dodo's change plan API
      await dodo.subscriptions.update(currentSub.dodoSubscriptionId, {
        product_id: priceId,
        metadata: {
          userId: ctx.user.id,
          planId: targetPlan.id,
          billingInterval: input.billingInterval,
        },
      });

      // Update local record
      await db
        .update(subscriptions)
        .set({
          planId: targetPlan.id,
          billingInterval: input.billingInterval,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, ctx.user.id));

      return { success: true };
    }),

  // Get current period usage
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    // Get current subscription period
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const periodStart = sub?.currentPeriodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const periodEnd = sub?.currentPeriodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const usage = await db
      .select({
        type: usageRecords.type,
        total: sql<number>`sum(${usageRecords.quantity})`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.userId, ctx.user.id),
          gte(usageRecords.periodStart, periodStart),
          lte(usageRecords.periodEnd, periodEnd)
        )
      )
      .groupBy(usageRecords.type);

    const usageMap: Record<string, number> = {};
    for (const row of usage) {
      usageMap[row.type] = Number(row.total) || 0;
    }

    return {
      inferenceRequests: usageMap["inference_request"] || 0,
      storageMb: usageMap["storage_mb"] || 0,
      periodStart: periodStart.getTime(),
      periodEnd: periodEnd.getTime(),
    };
  }),

  // Get invoice history
  getInvoices: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const result = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, ctx.user.id))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)
        .offset(offset);

      return result.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.getTime(),
        paidAt: inv.paidAt?.getTime() ?? null,
      }));
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const dodo = requireDodoClient();

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.dodoSubscriptionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No active subscription to cancel",
      });
    }

    // Cancel at period end in Dodo
    await dodo.subscriptions.update(sub.dodoSubscriptionId, {
      status: "cancelled",
    });

    await db
      .update(subscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(subscriptions.userId, ctx.user.id));

    return { success: true };
  }),

  // Get Dodo customer portal URL
  getPortalUrl: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.dodoCustomerId) {
      return { url: null };
    }

    // Dodo customer portal URL pattern
    const portalUrl = `https://checkout.dodopayments.com/customer-portal/${sub.dodoCustomerId}`;
    return { url: portalUrl };
  }),
});
```

**Step 2: Register billing router**

In `apps/server/src/trpc/index.ts`, add:

Import:
```typescript
import { billingRouter } from "./routers/billing";
```

In the `appRouter`:
```typescript
billing: billingRouter,
```

**Step 3: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/server/src/trpc/routers/billing.ts apps/server/src/trpc/index.ts
git commit -m "feat: add billing tRPC router (plans, checkout, changePlan, usage, invoices)"
```

---

## Task 8: Admin tRPC Router

**Files:**
- Create: `apps/server/src/trpc/routers/admin.ts`
- Modify: `apps/server/src/trpc/index.ts` (register router)

**Step 1: Create admin router**

Create `apps/server/src/trpc/routers/admin.ts`:

```typescript
import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db } from "../../db/client";
import {
  plans,
  subscriptions,
  invoices,
  usageRecords,
} from "../../db/schema";
import { eq, desc, sql, and, gte, lte, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "../../auth/clerk";

export const adminRouter = router({
  // List users with subscription info
  listUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Fetch users from Clerk
      const clerkUsers = await clerkClient.users.getUserList({
        limit: input.limit,
        offset: input.offset,
        query: input.search || undefined,
      });

      const userIds = clerkUsers.data.map((u) => u.id);

      // Get subscriptions for these users
      const subs =
        userIds.length > 0
          ? await db
              .select()
              .from(subscriptions)
              .where(
                sql`${subscriptions.userId} IN ${userIds}`
              )
          : [];

      const subMap = new Map(subs.map((s) => [s.userId, s]));

      return {
        users: clerkUsers.data.map((u) => {
          const sub = subMap.get(u.id);
          const primaryEmail = u.emailAddresses.find(
            (e) => e.id === u.primaryEmailAddressId
          );
          return {
            id: u.id,
            email: primaryEmail?.emailAddress || "",
            name:
              [u.firstName, u.lastName].filter(Boolean).join(" ") || "User",
            imageUrl: u.imageUrl,
            createdAt: u.createdAt,
            subscription: sub
              ? {
                  planId: sub.planId,
                  status: sub.status,
                  billingInterval: sub.billingInterval,
                }
              : null,
          };
        }),
        totalCount: clerkUsers.totalCount,
      };
    }),

  // Get detailed user info
  getUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      // Get user from Clerk
      const user = await clerkClient.users.getUser(input.userId);
      const primaryEmail = user.emailAddresses.find(
        (e) => e.id === user.primaryEmailAddressId
      );

      // Get subscription
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input.userId))
        .limit(1);

      // Get plan details
      const [plan] = sub
        ? await db
            .select()
            .from(plans)
            .where(eq(plans.id, sub.planId))
            .limit(1)
        : [null];

      // Get recent invoices
      const userInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, input.userId))
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      // Get current period usage
      const now = new Date();
      const periodStart =
        sub?.currentPeriodStart ||
        new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd =
        sub?.currentPeriodEnd ||
        new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const usage = await db
        .select({
          type: usageRecords.type,
          total: sql<number>`sum(${usageRecords.quantity})`,
        })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.userId, input.userId),
            gte(usageRecords.periodStart, periodStart),
            lte(usageRecords.periodEnd, periodEnd)
          )
        )
        .groupBy(usageRecords.type);

      const usageMap: Record<string, number> = {};
      for (const row of usage) {
        usageMap[row.type] = Number(row.total) || 0;
      }

      return {
        user: {
          id: user.id,
          email: primaryEmail?.emailAddress || "",
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") || "User",
          imageUrl: user.imageUrl,
          createdAt: user.createdAt,
          role: (user.publicMetadata as Record<string, unknown>)?.role || null,
        },
        subscription: sub
          ? {
              ...sub,
              createdAt: sub.createdAt.getTime(),
              updatedAt: sub.updatedAt.getTime(),
              currentPeriodStart: sub.currentPeriodStart?.getTime() ?? null,
              currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
            }
          : null,
        plan,
        invoices: userInvoices.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.getTime(),
          paidAt: inv.paidAt?.getTime() ?? null,
        })),
        usage: {
          inferenceRequests: usageMap["inference_request"] || 0,
          storageMb: usageMap["storage_mb"] || 0,
        },
      };
    }),

  // Force update a user's plan (admin override)
  updateUserPlan: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        planId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify plan exists
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      // Upsert subscription
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, input.userId))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            planId: input.planId,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, input.userId));
      } else {
        const { randomUUID } = await import("crypto");
        await db.insert(subscriptions).values({
          id: randomUUID(),
          userId: input.userId,
          planId: input.planId,
          status: "active",
          billingInterval: "none",
        });
      }

      return { success: true };
    }),

  // Dashboard stats
  getStats: adminProcedure.query(async () => {
    // Active subscriptions count by plan
    const subsByPlan = await db
      .select({
        planId: subscriptions.planId,
        count: sql<number>`count(*)`,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.planId);

    // MRR calculation
    const activeSubs = await db
      .select({
        billingInterval: subscriptions.billingInterval,
        planId: subscriptions.planId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const allPlans = await db.select().from(plans);
    const planMap = new Map(allPlans.map((p) => [p.id, p]));

    let mrr = 0;
    for (const sub of activeSubs) {
      const plan = planMap.get(sub.planId);
      if (!plan) continue;
      if (sub.billingInterval === "monthly") {
        mrr += plan.monthlyPrice;
      } else if (sub.billingInterval === "yearly") {
        mrr += Math.round(plan.yearlyPrice / 12);
      }
    }

    // Total revenue (all time)
    const [revenueResult] = await db
      .select({
        total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.status, "succeeded"));

    // Recent invoices
    const recentInvoices = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    return {
      mrr,
      totalRevenue: Number(revenueResult.total),
      subscriptionsByPlan: Object.fromEntries(
        subsByPlan.map((s) => [s.planId, Number(s.count)])
      ),
      totalActiveSubscriptions: activeSubs.length,
      recentInvoices: recentInvoices.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt.getTime(),
        paidAt: inv.paidAt?.getTime() ?? null,
      })),
    };
  }),

  // List all subscriptions
  listSubscriptions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z
          .enum(["active", "on_hold", "cancelled", "trialing", "expired"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(subscriptions.status, input.status));
      }

      const where =
        conditions.length > 0
          ? and(...conditions)
          : undefined;

      const result = await db
        .select()
        .from(subscriptions)
        .where(where)
        .orderBy(desc(subscriptions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(where);

      return {
        subscriptions: result.map((sub) => ({
          ...sub,
          createdAt: sub.createdAt.getTime(),
          updatedAt: sub.updatedAt.getTime(),
          currentPeriodStart: sub.currentPeriodStart?.getTime() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.getTime() ?? null,
        })),
        totalCount: Number(total[0].count),
      };
    }),

  // List all invoices
  listInvoices: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        status: z.enum(["succeeded", "failed", "refunded"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      const where =
        conditions.length > 0
          ? and(...conditions)
          : undefined;

      const result = await db
        .select()
        .from(invoices)
        .where(where)
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const total = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(where);

      return {
        invoices: result.map((inv) => ({
          ...inv,
          createdAt: inv.createdAt.getTime(),
          paidAt: inv.paidAt?.getTime() ?? null,
        })),
        totalCount: Number(total[0].count),
      };
    }),
});
```

**Step 2: Register admin router**

In `apps/server/src/trpc/index.ts`, add:

Import:
```typescript
import { adminRouter } from "./routers/admin";
```

In the `appRouter`:
```typescript
admin: adminRouter,
```

Also export adminProcedure from the barrel:
In the first line of `apps/server/src/trpc/index.ts`, update:
```typescript
export { router, publicProcedure, protectedProcedure, adminProcedure } from "./trpc";
```

**Step 3: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/server/src/trpc/routers/admin.ts apps/server/src/trpc/index.ts
git commit -m "feat: add admin tRPC router (users, subscriptions, invoices, stats)"
```

---

## Task 9: Entitlement Middleware

**Files:**
- Create: `apps/server/src/billing/entitlements.ts`
- Modify: `apps/server/src/trpc/trpc.ts` (add entitlement-aware procedure)

**Step 1: Create entitlements module**

Create `apps/server/src/billing/entitlements.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { subscriptions, plans } from "../db/schema";
import type { Plan } from "../db/schema/billing";

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
```

**Step 2: Add entitledProcedure to tRPC**

In `apps/server/src/trpc/trpc.ts`, add:

```typescript
import { getEntitlements, type Entitlements } from "../billing/entitlements";

interface EntitledContext extends AuthedContext {
  entitlements: Entitlements;
}

/**
 * Middleware to load user entitlements
 */
const withEntitlements = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const entitlements = await getEntitlements(ctx.user.id);

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      entitlements,
    } as EntitledContext,
  });
});

/**
 * Protected procedure with entitlements loaded
 * Use for routes that need to check plan limits
 */
export const entitledProcedure = t.procedure.use(isAuthed).use(withEntitlements);
```

Export it from the barrel in `apps/server/src/trpc/index.ts`:
```typescript
export { router, publicProcedure, protectedProcedure, adminProcedure, entitledProcedure } from "./trpc";
```

**Step 3: Type check**

Run:
```bash
cd apps/server && bun run type-check
```
Expected: No errors.

**Step 4: Commit**

```bash
git add apps/server/src/billing/entitlements.ts apps/server/src/trpc/trpc.ts apps/server/src/trpc/index.ts
git commit -m "feat: add entitlement middleware for plan limit enforcement"
```

---

## Task 10: Frontend — Pricing Page

**Files:**
- Create: `apps/web/src/routes/pricing.tsx`
- Create: `apps/web/src/components/billing/PlanCard.tsx`
- Modify: `apps/web/src/routeTree.gen.ts` (add route)

**Step 1: Create PlanCard component**

Create `apps/web/src/components/billing/PlanCard.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  description: string;
  monthlyPrice: number; // cents
  yearlyPrice: number; // cents
  features: Record<string, boolean>;
  limits: {
    inferenceRequests: number;
    storageMb: number;
    maxEnclaves: number;
  };
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  billingInterval: "monthly" | "yearly";
  onSelect: () => void;
  loading?: boolean;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function formatLimit(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  return `${value.toLocaleString()} ${unit}`;
}

const featureLabels: Record<string, string> = {
  voiceCalls: "Voice calls",
  prioritySupport: "Priority support",
  dedicatedEnclaves: "Dedicated enclaves",
  customModels: "Custom models",
};

export function PlanCard({
  name,
  description,
  monthlyPrice,
  yearlyPrice,
  features,
  limits,
  isCurrentPlan,
  isPopular,
  billingInterval,
  onSelect,
  loading,
}: PlanCardProps) {
  const price = billingInterval === "monthly" ? monthlyPrice : yearlyPrice;
  const monthlyEquivalent =
    billingInterval === "yearly" ? Math.round(yearlyPrice / 12) : monthlyPrice;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 sm:p-8",
        isPopular
          ? "border-primary bg-primary/5 shadow-lg"
          : "border-border bg-card",
        isCurrentPlan && "ring-2 ring-primary"
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold">{name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold">
          {formatPrice(monthlyEquivalent)}
        </span>
        <span className="text-muted-foreground">/mo</span>
        {billingInterval === "yearly" && monthlyPrice > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPrice(yearlyPrice)} billed yearly
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatLimit(limits.inferenceRequests, "inference requests/mo")}
        </li>
        <li className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-primary flex-shrink-0" />
          {formatLimit(limits.storageMb, "MB storage")}
        </li>
        {limits.maxEnclaves !== 0 && (
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {formatLimit(limits.maxEnclaves, "dedicated enclaves")}
          </li>
        )}
        {Object.entries(features).map(([key, enabled]) =>
          enabled ? (
            <li key={key} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
              {featureLabels[key] || key}
            </li>
          ) : null
        )}
      </ul>

      <Button
        onClick={onSelect}
        disabled={isCurrentPlan || loading}
        variant={isPopular ? "default" : "outline"}
        className="w-full"
      >
        {isCurrentPlan
          ? "Current Plan"
          : monthlyPrice === 0
            ? "Get Started"
            : "Upgrade"}
      </Button>
    </div>
  );
}
```

**Step 2: Create pricing page**

Create `apps/web/src/routes/pricing.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";
import { PlanCard } from "@/components/billing/PlanCard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PricingPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const { data: plans, isLoading } = trpc.billing.getPlans.useQuery();
  const { data: currentSub } = trpc.billing.getSubscription.useQuery(
    undefined,
    { enabled: !!isSignedIn }
  );
  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectPlan = (planId: string) => {
    if (!isSignedIn) {
      navigate({ to: "/auth" });
      return;
    }
    if (planId === "free") return;
    createCheckout.mutate({ planId, billingInterval });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose the plan that fits your needs
          </p>

          {/* Billing interval toggle */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "monthly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                billingInterval === "yearly"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Yearly
              <span className="ml-1 text-xs opacity-75">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              features={plan.features as Record<string, boolean>}
              limits={{
                inferenceRequests: plan.inferenceRequestsLimit,
                storageMb: plan.storageLimitMb,
                maxEnclaves: plan.maxEnclaves,
              }}
              isCurrentPlan={currentSub?.plan?.id === plan.id}
              isPopular={plan.id === "pro"}
              billingInterval={billingInterval}
              onSelect={() => handleSelectPlan(plan.id)}
              loading={createCheckout.isPending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Add route to routeTree**

In `apps/web/src/routeTree.gen.ts`:

1. Import the page:
```typescript
import { PricingPage } from "./routes/pricing";
```

2. Create the route (alongside the other public routes like privacy/terms):
```typescript
const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pricing",
  component: PricingPage,
});
```

3. Add to root route's children array (alongside existing public routes).

**Step 4: Type check**

Run:
```bash
cd apps/web && bun run type-check
```
Expected: No errors.

**Step 5: Commit**

```bash
git add apps/web/src/components/billing/PlanCard.tsx apps/web/src/routes/pricing.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add pricing page with plan comparison cards"
```

---

## Task 11: Frontend — Billing Settings Page

**Files:**
- Create: `apps/web/src/components/billing/UsageMeter.tsx`
- Create: `apps/web/src/components/billing/InvoiceTable.tsx`
- Create: `apps/web/src/routes/billing.tsx`
- Modify: `apps/web/src/routeTree.gen.ts` (add route)

**Step 1: Create UsageMeter component**

Create `apps/web/src/components/billing/UsageMeter.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  unit?: string;
}

export function UsageMeter({ label, used, limit, unit = "" }: UsageMeterProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80;
  const isDanger = !isUnlimited && percentage >= 95;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()}
          {isUnlimited
            ? ` ${unit} (Unlimited)`
            : ` / ${limit.toLocaleString()} ${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isDanger
                ? "bg-destructive"
                : isWarning
                  ? "bg-yellow-500"
                  : "bg-primary"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create InvoiceTable component**

Create `apps/web/src/components/billing/InvoiceTable.tsx`:

```tsx
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  description: string | null;
  paidAt: number | null;
  createdAt: number;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  succeeded: "bg-green-500/10 text-green-600",
  failed: "bg-red-500/10 text-red-600",
  refunded: "bg-yellow-500/10 text-yellow-600",
};

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No invoices yet
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 text-left font-medium text-muted-foreground">
              Date
            </th>
            <th className="pb-2 text-left font-medium text-muted-foreground">
              Description
            </th>
            <th className="pb-2 text-right font-medium text-muted-foreground">
              Amount
            </th>
            <th className="pb-2 text-right font-medium text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <td className="py-3">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </td>
              <td className="py-3 text-muted-foreground">
                {invoice.description || "Payment"}
              </td>
              <td className="py-3 text-right font-medium">
                ${(invoice.amountCents / 100).toFixed(2)}{" "}
                {invoice.currency}
              </td>
              <td className="py-3 text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    statusColors[invoice.status] || "bg-secondary text-foreground"
                  )}
                >
                  {invoice.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 3: Create billing settings page**

Create `apps/web/src/routes/billing.tsx`:

```tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/billing/PlanCard";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { toast } from "sonner";
import { CreditCard, ExternalLink } from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export function BillingPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">(
    "monthly"
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: plans } = trpc.billing.getPlans.useQuery();
  const { data: subData, refetch: refetchSub } =
    trpc.billing.getSubscription.useQuery();
  const { data: usage } = trpc.billing.getUsage.useQuery();
  const { data: invoicesData } = trpc.billing.getInvoices.useQuery({
    limit: 10,
  });
  const { data: portalData } = trpc.billing.getPortalUrl.useQuery();

  const changePlan = trpc.billing.changePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated successfully");
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setShowCancelDialog(false);
      refetchSub();
    },
    onError: (error) => toast.error(error.message),
  });

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error) => toast.error(error.message),
  });

  const currentPlan = subData?.plan;
  const subscription = subData?.subscription;
  const hasActiveSubscription =
    subscription && subscription.status === "active";

  const handlePlanAction = (planId: string) => {
    if (planId === "free") return;

    if (hasActiveSubscription) {
      changePlan.mutate({ planId, billingInterval });
    } else {
      createCheckout.mutate({ planId, billingInterval });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Plan & Usage */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Current Plan</h2>
        <div className="rounded-xl border border-border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">
                {currentPlan?.name || "Free"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentPlan?.description || "Basic features"}
              </p>
            </div>
            {subscription?.status && (
              <span className="inline-flex rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600">
                {subscription.status}
              </span>
            )}
          </div>

          {usage && currentPlan && (
            <div className="space-y-4">
              <UsageMeter
                label="Inference Requests"
                used={usage.inferenceRequests}
                limit={currentPlan.inferenceRequestsLimit}
                unit="requests"
              />
              <UsageMeter
                label="Storage"
                used={usage.storageMb}
                limit={currentPlan.storageLimitMb}
                unit="MB"
              />
            </div>
          )}

          <div className="flex gap-3">
            {portalData?.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={portalData.url} target="_blank" rel="noopener">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Payment Methods
                  <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </Button>
            )}
            {hasActiveSubscription && currentPlan?.id !== "free" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Change Plan */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Change Plan</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans?.map((plan) => (
            <PlanCard
              key={plan.id}
              name={plan.name}
              description={plan.description}
              monthlyPrice={plan.monthlyPrice}
              yearlyPrice={plan.yearlyPrice}
              features={plan.features as Record<string, boolean>}
              limits={{
                inferenceRequests: plan.inferenceRequestsLimit,
                storageMb: plan.storageLimitMb,
                maxEnclaves: plan.maxEnclaves,
              }}
              isCurrentPlan={currentPlan?.id === plan.id}
              isPopular={plan.id === "pro"}
              billingInterval={billingInterval}
              onSelect={() => handlePlanAction(plan.id)}
              loading={changePlan.isPending || createCheckout.isPending}
            />
          ))}
        </div>
      </section>

      {/* Invoices */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice History</h2>
        <div className="rounded-xl border border-border p-6">
          <InvoiceTable invoices={invoicesData || []} />
        </div>
      </section>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog.Root
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-lg">
            <AlertDialog.Title className="text-lg font-semibold">
              Cancel Subscription?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              Your subscription will remain active until the end of the current
              billing period. After that, you'll be downgraded to the Free plan.
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">Keep Subscription</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={() => cancelSubscription.mutate()}
                  disabled={cancelSubscription.isPending}
                >
                  {cancelSubscription.isPending
                    ? "Cancelling..."
                    : "Cancel Subscription"}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
```

**Step 4: Add route to routeTree**

In `apps/web/src/routeTree.gen.ts`:

1. Import:
```typescript
import { BillingPage } from "./routes/billing";
```

2. Create route (as child of appLayoutRoute, alongside home/chat/notes/prompts):
```typescript
const billingRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/billing",
  component: BillingPage,
});
```

3. Add to appLayoutRoute's children.

**Step 5: Type check**

Run:
```bash
cd apps/web && bun run type-check
```
Expected: No errors.

**Step 6: Commit**

```bash
git add apps/web/src/components/billing/ apps/web/src/routes/billing.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add billing settings page with usage meters and invoice history"
```

---

## Task 12: Frontend — Admin Panel Layout & Dashboard

**Files:**
- Create: `apps/web/src/components/admin/AdminLayout.tsx`
- Create: `apps/web/src/components/admin/StatsCard.tsx`
- Create: `apps/web/src/routes/admin/index.tsx`
- Modify: `apps/web/src/routeTree.gen.ts`

**Step 1: Create AdminLayout component**

Create `apps/web/src/components/admin/AdminLayout.tsx`:

```tsx
import { Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/app/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/admin/users", label: "Users", icon: Users, exact: false },
  {
    to: "/app/admin/subscriptions",
    label: "Subscriptions",
    icon: CreditCard,
    exact: false,
  },
  { to: "/app/admin/invoices", label: "Invoices", icon: Receipt, exact: false },
];

export function AdminLayout() {
  const matchRoute = useMatchRoute();

  return (
    <div className="flex h-full">
      {/* Admin Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-border p-4 space-y-1">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to="/app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="font-semibold text-sm">Admin Panel</h2>
        </div>

        {navItems.map((item) => {
          const isActive = item.exact
            ? matchRoute({ to: item.to })
            : matchRoute({ to: item.to, fuzzy: true });

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Admin Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Create StatsCard component**

Create `apps/web/src/components/admin/StatsCard.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ label, value, icon: Icon, description }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{value}</span>
      </div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
```

**Step 3: Create admin dashboard page**

Create `apps/web/src/routes/admin/index.tsx`:

```tsx
import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/admin/StatsCard";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { DollarSign, Users, CreditCard, TrendingUp } from "lucide-react";

export function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of billing and subscriptions
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Monthly Recurring Revenue"
          value={`$${((stats?.mrr || 0) / 100).toFixed(2)}`}
          icon={DollarSign}
        />
        <StatsCard
          label="Active Subscriptions"
          value={stats?.totalActiveSubscriptions || 0}
          icon={CreditCard}
        />
        <StatsCard
          label="Total Revenue"
          value={`$${((stats?.totalRevenue || 0) / 100).toFixed(2)}`}
          icon={TrendingUp}
        />
        <StatsCard
          label="Pro Users"
          value={stats?.subscriptionsByPlan?.pro || 0}
          icon={Users}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Invoices</h2>
        <div className="rounded-xl border border-border p-6">
          <InvoiceTable invoices={stats?.recentInvoices || []} />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Add admin routes to routeTree**

In `apps/web/src/routeTree.gen.ts`:

1. Import:
```typescript
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./routes/admin/index";
```

2. Create routes:
```typescript
const adminLayoutRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/admin",
  component: AdminLayout,
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/",
  component: AdminDashboard,
});
```

3. Add `adminLayoutRoute` to appLayoutRoute children, and `adminDashboardRoute` as child of `adminLayoutRoute`.

**Step 5: Type check**

Run:
```bash
cd apps/web && bun run type-check
```

**Step 6: Commit**

```bash
git add apps/web/src/components/admin/ apps/web/src/routes/admin/ apps/web/src/routeTree.gen.ts
git commit -m "feat: add admin panel layout and dashboard with stats"
```

---

## Task 13: Frontend — Admin Users Page

**Files:**
- Create: `apps/web/src/routes/admin/users.tsx`
- Create: `apps/web/src/routes/admin/user-detail.tsx`
- Modify: `apps/web/src/routeTree.gen.ts`

**Step 1: Create users list page**

Create `apps/web/src/routes/admin/users.tsx`:

```tsx
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.listUsers.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left font-medium">User</th>
              <th className="p-3 text-left font-medium">Plan</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-secondary" />
                    </td>
                  </tr>
                ))
              : data?.users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="p-3">
                      <Link
                        to="/app/admin/users/$userId"
                        params={{ userId: user.id }}
                        className="flex items-center gap-3"
                      >
                        {user.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                            {user.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          user.subscription?.planId === "enterprise"
                            ? "bg-purple-500/10 text-purple-600"
                            : user.subscription?.planId === "pro"
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {user.subscription?.planId || "free"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          user.subscription?.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : user.subscription?.status === "on_hold"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {user.subscription?.status || "none"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create user detail page**

Create `apps/web/src/routes/admin/user-detail.tsx`:

```tsx
import { useParams } from "@tanstack/react-router";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function AdminUserDetailPage() {
  const { userId } = useParams({ from: "/app/admin/users/$userId" });
  const { data, isLoading, refetch } = trpc.admin.getUser.useQuery({ userId });
  const { data: allPlans } = trpc.billing.getPlans.useQuery();

  const updatePlan = trpc.admin.updateUserPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 rounded-xl bg-secondary" />
        <div className="h-40 rounded-xl bg-secondary" />
      </div>
    );
  }

  if (!data) return <p>User not found</p>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/app/admin/users">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {data.user.imageUrl ? (
            <img
              src={data.user.imageUrl}
              alt=""
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-medium">
              {data.user.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{data.user.name}</h1>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
          </div>
        </div>
      </div>

      {/* Subscription Management */}
      <section className="rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Subscription</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Current plan:{" "}
            <strong>{data.plan?.name || "Free"}</strong>
          </span>
          {data.subscription && (
            <span className="text-sm text-muted-foreground">
              Status: {data.subscription.status}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {allPlans?.map((plan) => (
            <Button
              key={plan.id}
              variant={data.plan?.id === plan.id ? "default" : "outline"}
              size="sm"
              onClick={() => updatePlan.mutate({ userId, planId: plan.id })}
              disabled={
                data.plan?.id === plan.id || updatePlan.isPending
              }
            >
              {data.plan?.id === plan.id ? `${plan.name} (current)` : plan.name}
            </Button>
          ))}
        </div>
      </section>

      {/* Usage */}
      {data.plan && (
        <section className="rounded-xl border border-border p-6 space-y-4">
          <h2 className="font-semibold">Usage</h2>
          <UsageMeter
            label="Inference Requests"
            used={data.usage.inferenceRequests}
            limit={data.plan.inferenceRequestsLimit}
            unit="requests"
          />
          <UsageMeter
            label="Storage"
            used={data.usage.storageMb}
            limit={data.plan.storageLimitMb}
            unit="MB"
          />
        </section>
      )}

      {/* Invoices */}
      <section className="rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold">Invoice History</h2>
        <InvoiceTable invoices={data.invoices || []} />
      </section>
    </div>
  );
}
```

**Step 3: Add routes to routeTree**

In `apps/web/src/routeTree.gen.ts`:

1. Import:
```typescript
import { AdminUsersPage } from "./routes/admin/users";
import { AdminUserDetailPage } from "./routes/admin/user-detail";
```

2. Create routes:
```typescript
const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/users",
  component: AdminUsersPage,
});

const adminUserDetailRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/users/$userId",
  component: AdminUserDetailPage,
});
```

3. Add both as children of `adminLayoutRoute`.

**Step 4: Type check**

Run:
```bash
cd apps/web && bun run type-check
```

**Step 5: Commit**

```bash
git add apps/web/src/routes/admin/users.tsx apps/web/src/routes/admin/user-detail.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add admin users list and user detail pages"
```

---

## Task 14: Frontend — Admin Subscriptions & Invoices Pages

**Files:**
- Create: `apps/web/src/routes/admin/subscriptions.tsx`
- Create: `apps/web/src/routes/admin/invoices.tsx`
- Modify: `apps/web/src/routeTree.gen.ts`

**Step 1: Create subscriptions page**

Create `apps/web/src/routes/admin/subscriptions.tsx`:

```tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions = [
  { value: undefined, label: "All" },
  { value: "active" as const, label: "Active" },
  { value: "on_hold" as const, label: "On Hold" },
  { value: "cancelled" as const, label: "Cancelled" },
  { value: "trialing" as const, label: "Trialing" },
];

export function AdminSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.listSubscriptions.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter as any,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscriptions</h1>

      {/* Status filter */}
      <div className="flex gap-2">
        {statusOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(0);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="p-3 text-left font-medium">User ID</th>
              <th className="p-3 text-left font-medium">Plan</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Interval</th>
              <th className="p-3 text-left font-medium">Period End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-secondary" />
                    </td>
                  </tr>
                ))
              : data?.subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-accent/50">
                    <td className="p-3 font-mono text-xs">{sub.userId}</td>
                    <td className="p-3">{sub.planId}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          sub.status === "active"
                            ? "bg-green-500/10 text-green-600"
                            : sub.status === "on_hold"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3">{sub.billingInterval}</td>
                    <td className="p-3 text-muted-foreground">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create invoices page**

Create `apps/web/src/routes/admin/invoices.tsx`:

```tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { ChevronLeft, ChevronRight } from "lucide-react";

const statusOptions = [
  { value: undefined, label: "All" },
  { value: "succeeded" as const, label: "Succeeded" },
  { value: "failed" as const, label: "Failed" },
  { value: "refunded" as const, label: "Refunded" },
];

export function AdminInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.admin.listInvoices.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter as any,
  });

  const totalPages = data ? Math.ceil(data.totalCount / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>

      <div className="flex gap-2">
        {statusOptions.map((opt) => (
          <Button
            key={opt.label}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(0);
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border p-6">
        <InvoiceTable invoices={data?.invoices || []} isLoading={isLoading} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Add routes to routeTree**

In `apps/web/src/routeTree.gen.ts`:

1. Import:
```typescript
import { AdminSubscriptionsPage } from "./routes/admin/subscriptions";
import { AdminInvoicesPage } from "./routes/admin/invoices";
```

2. Create routes:
```typescript
const adminSubscriptionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/subscriptions",
  component: AdminSubscriptionsPage,
});

const adminInvoicesRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/invoices",
  component: AdminInvoicesPage,
});
```

3. Add as children of `adminLayoutRoute`.

**Step 4: Type check**

Run:
```bash
cd apps/web && bun run type-check
```

**Step 5: Commit**

```bash
git add apps/web/src/routes/admin/subscriptions.tsx apps/web/src/routes/admin/invoices.tsx apps/web/src/routeTree.gen.ts
git commit -m "feat: add admin subscriptions and invoices pages"
```

---

## Task 15: Admin Route Guard

**Files:**
- Modify: `apps/web/src/components/admin/AdminLayout.tsx`

**Step 1: Add Clerk role check to AdminLayout**

In `apps/web/src/components/admin/AdminLayout.tsx`, add an admin role check at the top of the component:

```tsx
import { useUser } from "@clerk/clerk-react";
import { Navigate } from "@tanstack/react-router";

export function AdminLayout() {
  const { user, isLoaded } = useUser();
  const matchRoute = useMatchRoute();

  // Check admin role from Clerk publicMetadata
  if (isLoaded && (!user || (user.publicMetadata as any)?.role !== "admin")) {
    return <Navigate to="/app" />;
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    // ... existing layout JSX
  );
}
```

**Step 2: Type check**

Run:
```bash
cd apps/web && bun run type-check
```

**Step 3: Commit**

```bash
git add apps/web/src/components/admin/AdminLayout.tsx
git commit -m "feat: add Clerk role-based admin route guard"
```

---

## Task 16: Integration Tests — Webhook Handler

**Files:**
- Create: `apps/server/src/billing/__tests__/webhook.test.ts`

**Step 1: Write webhook handler tests**

Create `apps/server/src/billing/__tests__/webhook.test.ts`:

```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock the db module before importing webhook
mock.module("../../db/client", () => {
  const mockDb = {
    update: mock(() => mockDb),
    set: mock(() => mockDb),
    where: mock(() => mockDb),
    returning: mock(() => []),
    insert: mock(() => mockDb),
    values: mock(() => mockDb),
    select: mock(() => mockDb),
    from: mock(() => mockDb),
    limit: mock(() => []),
  };
  return { db: mockDb, subscriptions: {}, invoices: {} };
});

mock.module("../dodo", () => ({
  dodoClient: null,
  DODO_WEBHOOK_KEY: "",
}));

// Now import the webhook handler
import { webhookApp } from "../webhook";

describe("Dodo Webhook Handler", () => {
  it("should return 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: "not json",
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(400);
  });

  it("should return 200 for valid subscription.active event", async () => {
    const payload = {
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      },
    };

    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(200);
  });

  it("should return 200 for unhandled event types", async () => {
    const payload = {
      type: "unknown.event",
      data: {},
    };

    const req = new Request("http://localhost/dodo", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    const res = await webhookApp.fetch(req);
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Run tests**

Run:
```bash
cd apps/server && bun test src/billing/__tests__/webhook.test.ts
```
Expected: All tests pass.

**Step 3: Commit**

```bash
git add apps/server/src/billing/__tests__/webhook.test.ts
git commit -m "test: add webhook handler integration tests"
```

---

## Task 17: Update Environment & Final Cleanup

**Files:**
- Modify: `apps/server/.env.example`

**Step 1: Verify env example is updated**

Ensure `apps/server/.env.example` has:

```env
# Billing (Dodo Payments)
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_SECRET=
```

(This should already be done in Task 4, verify it exists.)

**Step 2: Full type check on both apps**

Run:
```bash
cd apps/server && bun run type-check && cd ../web && bun run type-check
```
Expected: No errors in either app.

**Step 3: Run all existing tests**

Run:
```bash
cd apps/server && bun test
```
Expected: All tests pass (both existing and new).

**Step 4: Final commit**

If any fixes were needed:
```bash
git add -A
git commit -m "fix: resolve type errors and test failures from billing integration"
```
