-- Encrypted Credentials Metadata
-- Add encrypted columns for name and provider

ALTER TABLE "credentials" ADD COLUMN "encrypted_name" text;
ALTER TABLE "credentials" ADD COLUMN "name_nonce" text;
ALTER TABLE "credentials" ADD COLUMN "encrypted_provider" text;
ALTER TABLE "credentials" ADD COLUMN "provider_nonce" text;
ALTER TABLE "credentials" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "credentials" ALTER COLUMN "provider" DROP NOT NULL;
