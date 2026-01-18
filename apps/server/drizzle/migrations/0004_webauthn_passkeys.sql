-- WebAuthn Passkey Support for E2EE
-- Adds passkey-based unlock using WebAuthn PRF extension

-- Add password fallback fields to key_shares (for SSO users without PRF support)
ALTER TABLE "key_shares" ADD COLUMN "encrypted_master_key_password" text;
ALTER TABLE "key_shares" ADD COLUMN "master_key_password_nonce" text;
ALTER TABLE "key_shares" ADD COLUMN "password_kek_salt" text;
ALTER TABLE "key_shares" ADD COLUMN "password_kek_ops_limit" integer;
ALTER TABLE "key_shares" ADD COLUMN "password_kek_mem_limit" integer;

-- Create WebAuthn credentials table
CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "credential_id" text NOT NULL,
  "credential_public_key" text NOT NULL,
  "counter" integer DEFAULT 0 NOT NULL,
  "credential_device_type" text NOT NULL,
  "credential_backed_up" boolean DEFAULT false,
  "transports" text[],
  "encrypted_master_key" text NOT NULL,
  "master_key_nonce" text NOT NULL,
  "prf_salt" text NOT NULL,
  "name" text,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for WebAuthn credentials
CREATE INDEX IF NOT EXISTS "idx_webauthn_user_id" ON "webauthn_credentials" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_webauthn_credential_id" ON "webauthn_credentials" ("credential_id");
