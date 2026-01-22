-- Encrypted Prompts
-- Add encrypted columns and make plaintext nullable

ALTER TABLE "prompts" ADD COLUMN "encrypted_name" text;
ALTER TABLE "prompts" ADD COLUMN "name_nonce" text;
ALTER TABLE "prompts" ADD COLUMN "encrypted_description" text;
ALTER TABLE "prompts" ADD COLUMN "description_nonce" text;
ALTER TABLE "prompts" ADD COLUMN "encrypted_content" text;
ALTER TABLE "prompts" ADD COLUMN "content_nonce" text;
ALTER TABLE "prompts" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "prompts" ALTER COLUMN "content" DROP NOT NULL;
