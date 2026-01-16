-- Add key_shares table for E2EE with 3-share system
CREATE TABLE "key_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"encrypted_auth_share" text NOT NULL,
	"auth_share_nonce" text NOT NULL,
	"encrypted_recovery_share" text NOT NULL,
	"recovery_share_nonce" text NOT NULL,
	"public_key" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"private_key_nonce" text NOT NULL,
	"master_key_recovery" text NOT NULL,
	"master_key_recovery_nonce" text NOT NULL,
	"encrypted_recovery_key" text NOT NULL,
	"recovery_key_nonce" text NOT NULL,
	"encrypted_master_key_for_login" text NOT NULL,
	"master_key_for_login_nonce" text NOT NULL,
	"share_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add devices table for device tracking
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"user_agent" text,
	"trusted" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Create indexes for key_shares
CREATE UNIQUE INDEX "idx_key_shares_user_id" ON "key_shares" USING btree ("user_id");
--> statement-breakpoint
-- Create indexes for devices
CREATE INDEX "idx_devices_user_id" ON "devices" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_devices_user_device" ON "devices" USING btree ("user_id", "device_id");
