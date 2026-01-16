CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`is_encrypted` integer DEFAULT true NOT NULL,
	`encrypted_chat_key` text,
	`chat_key_nonce` text,
	`encrypted_title` text,
	`title_nonce` text,
	`encrypted_chat` text,
	`chat_nonce` text,
	`title_preview` text,
	`folder_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_chats_user_id` ON `chats` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_chats_folder_id` ON `chats` (`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_chats_user_updated` ON `chats` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`name` text NOT NULL,
	`encrypted_data` text NOT NULL,
	`iv` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_credentials_user_id` ON `credentials` (`user_id`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`device_name` text,
	`user_agent` text,
	`trusted` integer DEFAULT true NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_devices_user_id` ON `devices` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_devices_user_device` ON `devices` (`user_id`,`device_id`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_folders_user_id` ON `folders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_folders_parent_id` ON `folders` (`parent_id`);--> statement-breakpoint
CREATE TABLE `key_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`encrypted_auth_share` text NOT NULL,
	`auth_share_nonce` text NOT NULL,
	`encrypted_recovery_share` text NOT NULL,
	`recovery_share_nonce` text NOT NULL,
	`public_key` text NOT NULL,
	`encrypted_private_key` text NOT NULL,
	`private_key_nonce` text NOT NULL,
	`master_key_recovery` text NOT NULL,
	`master_key_recovery_nonce` text NOT NULL,
	`encrypted_recovery_key` text NOT NULL,
	`recovery_key_nonce` text NOT NULL,
	`encrypted_master_key_for_login` text NOT NULL,
	`master_key_for_login_nonce` text NOT NULL,
	`share_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `key_shares_user_id_unique` ON `key_shares` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_key_shares_user_id` ON `key_shares` (`user_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`encrypted_title` text NOT NULL,
	`title_nonce` text NOT NULL,
	`encrypted_content` text NOT NULL,
	`content_nonce` text NOT NULL,
	`folder_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_notes_user_id` ON `notes` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notes_folder_id` ON `notes` (`folder_id`);--> statement-breakpoint
CREATE INDEX `idx_notes_user_archived` ON `notes` (`user_id`,`archived`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_prompts_user_id` ON `prompts` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
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
CREATE UNIQUE INDEX `user_keys_user_id_unique` ON `user_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_user_keys_user_id` ON `user_keys` (`user_id`);