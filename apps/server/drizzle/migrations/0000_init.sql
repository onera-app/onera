-- SQLite migration for Onera
-- Generated for SQLite database

-- Better Auth: Users table
CREATE TABLE IF NOT EXISTS `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer DEFAULT false NOT NULL,
  `image` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_user_email` ON `user` (`email`);
--> statement-breakpoint
-- Better Auth: Sessions table
CREATE TABLE IF NOT EXISTS `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_session_user_id` ON `session` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_session_token` ON `session` (`token`);
--> statement-breakpoint
-- Better Auth: Accounts table
CREATE TABLE IF NOT EXISTS `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_account_user_id` ON `account` (`user_id`);
--> statement-breakpoint
-- Better Auth: Verifications table
CREATE TABLE IF NOT EXISTS `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_verification_identifier` ON `verification` (`identifier`);
--> statement-breakpoint
-- Application: User encryption keys (E2EE)
CREATE TABLE IF NOT EXISTS `user_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL UNIQUE REFERENCES `user` (`id`) ON DELETE CASCADE,
  `kek_salt` text NOT NULL,
  `kek_ops_limit` integer NOT NULL,
  `kek_mem_limit` integer NOT NULL,
  `encrypted_master_key` text NOT NULL,
  `master_key_nonce` text NOT NULL,
  `public_key` text NOT NULL,
  `encrypted_private_key` text NOT NULL,
  `private_key_nonce` text NOT NULL,
  `encrypted_recovery_key` text NOT NULL,
  `recovery_key_nonce` text NOT NULL,
  `master_key_recovery` text NOT NULL,
  `master_key_recovery_nonce` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_keys_user_id` ON `user_keys` (`user_id`);
--> statement-breakpoint
-- Application: Folders (hierarchical)
CREATE TABLE IF NOT EXISTS `folders` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `parent_id` text REFERENCES `folders` (`id`) ON DELETE SET NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_folders_user_id` ON `folders` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_folders_parent_id` ON `folders` (`parent_id`);
--> statement-breakpoint
-- Application: Chats (encrypted)
CREATE TABLE IF NOT EXISTS `chats` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `is_encrypted` integer DEFAULT true NOT NULL,
  `encrypted_chat_key` text,
  `chat_key_nonce` text,
  `encrypted_title` text,
  `title_nonce` text,
  `encrypted_chat` text,
  `chat_nonce` text,
  `title_preview` text,
  `folder_id` text REFERENCES `folders` (`id`) ON DELETE SET NULL,
  `pinned` integer DEFAULT false NOT NULL,
  `archived` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chats_user_id` ON `chats` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chats_folder_id` ON `chats` (`folder_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_chats_user_updated` ON `chats` (`user_id`, `updated_at`);
--> statement-breakpoint
-- Application: Notes (encrypted)
CREATE TABLE IF NOT EXISTS `notes` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `encrypted_title` text NOT NULL,
  `title_nonce` text NOT NULL,
  `encrypted_content` text NOT NULL,
  `content_nonce` text NOT NULL,
  `folder_id` text REFERENCES `folders` (`id`) ON DELETE SET NULL,
  `pinned` integer DEFAULT false NOT NULL,
  `archived` integer DEFAULT false NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notes_user_id` ON `notes` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notes_folder_id` ON `notes` (`folder_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_notes_user_archived` ON `notes` (`user_id`, `archived`);
--> statement-breakpoint
-- Application: Credentials (encrypted API keys)
CREATE TABLE IF NOT EXISTS `credentials` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `provider` text NOT NULL,
  `name` text NOT NULL,
  `encrypted_data` text NOT NULL,
  `iv` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_credentials_user_id` ON `credentials` (`user_id`);
--> statement-breakpoint
-- Application: Prompts (templates)
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user` (`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `description` text,
  `content` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_prompts_user_id` ON `prompts` (`user_id`);
