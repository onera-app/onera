-- Repair migration: ensures all billing tables exist.
-- Previous deploy may have recorded migrations 0014-0018 as applied
-- without the tables actually being created (due to drizzle-kit push --force interference).

-- Plans table
CREATE TABLE IF NOT EXISTS "plans" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "monthly_price" integer NOT NULL,
  "yearly_price" integer NOT NULL,
  "inference_requests_limit" integer NOT NULL,
  "storage_limit_mb" integer NOT NULL,
  "max_enclaves" integer NOT NULL,
  "features" jsonb NOT NULL,
  "dodo_price_id_monthly" text,
  "dodo_price_id_yearly" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Columns added in later migrations
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "byok_inference_requests_limit" integer NOT NULL DEFAULT -1;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "tier" integer NOT NULL DEFAULT 0;--> statement-breakpoint

-- Subscriptions table
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
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Subscription columns from later migrations
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan_id" text REFERENCES "plans"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_billing_interval" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "usage_based_billing" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "dodo_usage_subscription_id" text;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_dodo_subscription_id" ON "subscriptions" USING btree ("dodo_subscription_id");--> statement-breakpoint

-- Invoices table
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
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_invoices_user_id" ON "invoices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_invoices_subscription_id" ON "invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_invoices_dodo_payment_id" ON "invoices" USING btree ("dodo_payment_id") WHERE "dodo_payment_id" IS NOT NULL;--> statement-breakpoint

-- Usage Records table
CREATE TABLE IF NOT EXISTS "usage_records" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "quantity" integer NOT NULL,
  "period_start" timestamp NOT NULL,
  "period_end" timestamp NOT NULL,
  "recorded_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Usage records column from later migration
ALTER TABLE "usage_records" ADD COLUMN IF NOT EXISTS "is_overage" boolean NOT NULL DEFAULT false;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_usage_records_user_id" ON "usage_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usage_records_user_period" ON "usage_records" USING btree ("user_id", "type", "period_start", "period_end");
