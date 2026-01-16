-- Drop foreign key constraints to the user table
-- Clerk is the source of truth for users, so we don't need local FK constraints

ALTER TABLE "credentials" DROP CONSTRAINT IF EXISTS "credentials_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chats_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "folders" DROP CONSTRAINT IF EXISTS "folders_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "prompts" DROP CONSTRAINT IF EXISTS "prompts_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_keys" DROP CONSTRAINT IF EXISTS "user_keys_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
