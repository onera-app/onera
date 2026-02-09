ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_plan_id" text REFERENCES "plans"("id");
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pending_billing_interval" text;
