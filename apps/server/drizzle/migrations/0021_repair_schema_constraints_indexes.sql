-- Repair migration: fixes schema drift (missing FKs, indexes, unique constraint, duplicate index)
-- Issues found during Supabase schema review 2026-02-17

-- Clean up orphaned enclave_assignments referencing deleted enclaves
DELETE FROM "enclave_assignments"
WHERE "enclave_id" NOT IN (SELECT "id" FROM "enclaves");
--> statement-breakpoint

-- FK: enclave_assignments.enclave_id -> enclaves.id (CASCADE)
DO $$ BEGIN
  ALTER TABLE "enclave_assignments"
    ADD CONSTRAINT "enclave_assignments_enclave_id_enclaves_id_fk"
    FOREIGN KEY ("enclave_id") REFERENCES "enclaves"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- FK: server_models.server_id -> model_servers.id (CASCADE)
DO $$ BEGIN
  ALTER TABLE "server_models"
    ADD CONSTRAINT "server_models_server_id_model_servers_id_fk"
    FOREIGN KEY ("server_id") REFERENCES "model_servers"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- FK: subscriptions.pending_plan_id -> plans.id
DO $$ BEGIN
  ALTER TABLE "subscriptions"
    ADD CONSTRAINT "subscriptions_pending_plan_id_plans_id_fk"
    FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Unique: server_models (server_id, model_id)
DO $$ BEGIN
  ALTER TABLE "server_models"
    ADD CONSTRAINT "uq_server_model" UNIQUE ("server_id", "model_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Indexes: enclave_assignments
CREATE INDEX IF NOT EXISTS "idx_enclave_assignments_user_id"
  ON "enclave_assignments" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enclave_assignments_enclave_id"
  ON "enclave_assignments" USING btree ("enclave_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enclave_assignments_session_id"
  ON "enclave_assignments" USING btree ("session_id");
--> statement-breakpoint

-- Indexes: enclaves
CREATE INDEX IF NOT EXISTS "idx_enclaves_status"
  ON "enclaves" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_enclaves_tier"
  ON "enclaves" USING btree ("tier");
--> statement-breakpoint

-- Index: subscriptions.plan_id (unindexed FK)
CREATE INDEX IF NOT EXISTS "idx_subscriptions_plan_id"
  ON "subscriptions" USING btree ("plan_id");
--> statement-breakpoint

-- Drop duplicate constraint-backed index on key_shares.user_id
-- Keeps idx_key_shares_user_id (Drizzle-defined unique index)
ALTER TABLE "key_shares" DROP CONSTRAINT IF EXISTS "key_shares_user_id_unique";
