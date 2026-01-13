import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Helper for generating UUIDs in SQLite
// SQLite doesn't have native UUID, so we use text with a default random UUID
const uuid = (name: string) => text(name);
const uuidPrimaryKey = (name: string) =>
  text(name)
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// Helper for timestamps - SQLite stores as integer (Unix timestamp in ms)
const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

// ============================================
// Better Auth Tables
// ============================================

// Users table (Better Auth core table)
export const users = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" })
      .default(false)
      .notNull(),
    image: text("image"),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [uniqueIndex("idx_user_email").on(table.email)]
);

// Sessions table (Better Auth)
export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_session_user_id").on(table.userId),
    uniqueIndex("idx_session_token").on(table.token),
  ]
);

// Accounts table (Better Auth - for password and OAuth providers)
export const accounts = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [index("idx_account_user_id").on(table.userId)]
);

// Verification table (Better Auth - for email verification, password reset)
export const verifications = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);

// ============================================
// Application Tables
// ============================================

// User encryption keys (E2EE)
export const userKeys = sqliteTable(
  "user_keys",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    // KEK derivation params
    kekSalt: text("kek_salt").notNull(),
    kekOpsLimit: integer("kek_ops_limit").notNull(),
    kekMemLimit: integer("kek_mem_limit").notNull(),
    // Encrypted master key
    encryptedMasterKey: text("encrypted_master_key").notNull(),
    masterKeyNonce: text("master_key_nonce").notNull(),
    // Public/private key pair
    publicKey: text("public_key").notNull(),
    encryptedPrivateKey: text("encrypted_private_key").notNull(),
    privateKeyNonce: text("private_key_nonce").notNull(),
    // Recovery key
    encryptedRecoveryKey: text("encrypted_recovery_key").notNull(),
    recoveryKeyNonce: text("recovery_key_nonce").notNull(),
    masterKeyRecovery: text("master_key_recovery").notNull(),
    masterKeyRecoveryNonce: text("master_key_recovery_nonce").notNull(),
    // Timestamps
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [index("idx_user_keys_user_id").on(table.userId)]
);

// Folders (hierarchical)
export const folders = sqliteTable(
  "folders",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: text("parent_id").references((): any => folders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [
    index("idx_folders_user_id").on(table.userId),
    index("idx_folders_parent_id").on(table.parentId),
  ]
);

// Chats (encrypted)
export const chats = sqliteTable(
  "chats",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Encryption metadata
    isEncrypted: integer("is_encrypted", { mode: "boolean" })
      .default(true)
      .notNull(),
    encryptedChatKey: text("encrypted_chat_key"),
    chatKeyNonce: text("chat_key_nonce"),
    // Encrypted content
    encryptedTitle: text("encrypted_title"),
    titleNonce: text("title_nonce"),
    encryptedChat: text("encrypted_chat"),
    chatNonce: text("chat_nonce"),
    // Plaintext preview
    titlePreview: text("title_preview"),
    // Organization
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
    archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
    // Timestamps
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [
    index("idx_chats_user_id").on(table.userId),
    index("idx_chats_folder_id").on(table.folderId),
    index("idx_chats_user_updated").on(table.userId, table.updatedAt),
  ]
);

// Notes (encrypted)
export const notes = sqliteTable(
  "notes",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Encrypted content
    encryptedTitle: text("encrypted_title").notNull(),
    titleNonce: text("title_nonce").notNull(),
    encryptedContent: text("encrypted_content").notNull(),
    contentNonce: text("content_nonce").notNull(),
    // Organization
    folderId: text("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    pinned: integer("pinned", { mode: "boolean" }).default(false).notNull(),
    archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
    // Timestamps
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [
    index("idx_notes_user_id").on(table.userId),
    index("idx_notes_folder_id").on(table.folderId),
    index("idx_notes_user_archived").on(table.userId, table.archived),
  ]
);

// Credentials (encrypted API keys)
export const credentials = sqliteTable(
  "credentials",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    encryptedData: text("encrypted_data").notNull(),
    iv: text("iv").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [index("idx_credentials_user_id").on(table.userId)]
);

// Prompts (templates)
export const prompts = sqliteTable(
  "prompts",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`(unixepoch() * 1000)`)
      .notNull(),
  },
  (table) => [index("idx_prompts_user_id").on(table.userId)]
);

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type UserKey = typeof userKeys.$inferSelect;
export type NewUserKey = typeof userKeys.$inferInsert;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
