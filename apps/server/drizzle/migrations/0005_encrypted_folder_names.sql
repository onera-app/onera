-- Encrypted Folder Names
-- Add encrypted name columns and make plaintext name nullable

ALTER TABLE "folders" ADD COLUMN "encrypted_name" text;
ALTER TABLE "folders" ADD COLUMN "name_nonce" text;
ALTER TABLE "folders" ALTER COLUMN "name" DROP NOT NULL;
