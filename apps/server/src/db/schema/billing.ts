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
  id: text("id").primaryKey(), // 'free', 'starter', 'pro', 'privacy_max', 'team'
  name: text("name").notNull(),
  description: text("description").notNull(),
  monthlyPrice: integer("monthly_price").notNull(), // cents
  yearlyPrice: integer("yearly_price").notNull(), // cents
  inferenceRequestsLimit: integer("inference_requests_limit").notNull(), // -1 = unlimited (private/enclave)
  byokInferenceRequestsLimit: integer("byok_inference_requests_limit").notNull().default(-1), // -1 = unlimited (BYOK)
  storageLimitMb: integer("storage_limit_mb").notNull(),
  maxEnclaves: integer("max_enclaves").notNull(),
  features: jsonb("features").$type<Record<string, boolean>>().notNull(),
  tier: integer("tier").notNull().default(0), // 0=free, 1=starter, 2=pro, 3=privacy_max, 4=team
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
      .$type<"active" | "on_hold" | "cancelled" | "trialing" | "expired" | "pending">(),
    billingInterval: text("billing_interval")
      .notNull()
      .$type<"monthly" | "yearly" | "none">(),
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    pendingPlanId: text("pending_plan_id").references(() => plans.id),
    pendingBillingInterval: text("pending_billing_interval").$type<"monthly" | "yearly" | null>(),
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
    uniqueIndex("idx_invoices_dodo_payment_id").on(table.dodoPaymentId),
  ]
);

// --- Usage Records ---

export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: text("type").notNull().$type<"inference_request" | "byok_inference_request" | "storage_mb">(),
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
