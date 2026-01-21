-- Migration: privy_style_e2ee_security
-- Security improvements for E2EE following Privy's server-protected model
--
-- Changes:
-- 1. Auth share: Remove weak encryption, store plaintext (protected by Clerk auth)
-- 2. Device secrets: Add server-side entropy for device share encryption
-- 3. Remove titlePreview: Eliminate plaintext data leak
-- 4. Remove login key shortcut: This was the primary vulnerability

-- ============================================
-- 0. Enable pgcrypto extension for gen_random_bytes
-- ============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

-- ============================================
-- 1. Auth Share: Remove encrypted columns, add plaintext
-- ============================================

-- Add new plaintext auth share column
ALTER TABLE "key_shares" ADD COLUMN "auth_share" text;
--> statement-breakpoint

-- Migrate existing encrypted auth shares to plaintext
-- Note: This requires a data migration script to decrypt existing shares
-- For new users, the auth_share column will be populated directly
-- Existing users will need to re-authenticate to migrate their auth shares
--> statement-breakpoint

-- Remove vulnerable login key columns (master key encrypted with user-ID-derived key)
ALTER TABLE "key_shares" DROP COLUMN IF EXISTS "encrypted_master_key_for_login";
--> statement-breakpoint
ALTER TABLE "key_shares" DROP COLUMN IF EXISTS "master_key_for_login_nonce";
--> statement-breakpoint

-- Remove old encrypted auth share columns
ALTER TABLE "key_shares" DROP COLUMN IF EXISTS "encrypted_auth_share";
--> statement-breakpoint
ALTER TABLE "key_shares" DROP COLUMN IF EXISTS "auth_share_nonce";
--> statement-breakpoint

-- Make auth_share required for new rows
-- Note: This will fail if there are existing rows without auth_share
-- Run data migration first, then apply this constraint
ALTER TABLE "key_shares" ALTER COLUMN "auth_share" SET NOT NULL;
--> statement-breakpoint

-- ============================================
-- 2. Device Secrets: Add server-side entropy
-- ============================================

-- Add device_secret column with random default
ALTER TABLE "devices" ADD COLUMN "device_secret" text DEFAULT encode(gen_random_bytes(32), 'base64') NOT NULL;
--> statement-breakpoint

-- ============================================
-- 3. Remove titlePreview: Data leak prevention
-- ============================================

-- Drop the plaintext title preview column
ALTER TABLE "chats" DROP COLUMN IF EXISTS "title_preview";
--> statement-breakpoint

-- ============================================
-- Indexes (if needed)
-- ============================================

-- No new indexes required for these changes
