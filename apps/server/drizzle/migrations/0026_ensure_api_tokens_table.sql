-- Re-apply api_tokens table creation (0025 was recorded but DDL was not applied)
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL DEFAULT 'Default',
  "token_hash" text NOT NULL,
  "token_prefix" text NOT NULL,
  "last_used_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_tokens_user_id"
  ON "api_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_tokens_token_hash"
  ON "api_tokens" USING btree ("token_hash");
--> statement-breakpoint
ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY;
