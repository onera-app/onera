import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Helper for UUID primary keys with auto-generation
const uuidPrimaryKey = (name: string) =>
  uuid(name).primaryKey().defaultRandom();

// ============================================
// Better Auth Tables
// ============================================

// Users table (Better Auth core table)
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("idx_user_email").on(table.email)]
);

// Sessions table (Better Auth)
export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const accounts = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_account_user_id").on(table.userId)]
);

// Verification table (Better Auth - for email verification, password reset)
export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_verification_identifier").on(table.identifier)]
);

// ============================================
// Application Tables
// ============================================

// User encryption keys (E2EE)
export const userKeys = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index("idx_user_keys_user_id").on(table.userId)]
);

// Folders (hierarchical)
export const folders = pgTable(
  "folders",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): any => folders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_folders_user_id").on(table.userId),
    index("idx_folders_parent_id").on(table.parentId),
  ]
);

// Chats (encrypted)
export const chats = pgTable(
  "chats",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Encryption metadata
    isEncrypted: boolean("is_encrypted").default(true).notNull(),
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
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    pinned: boolean("pinned").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_chats_user_id").on(table.userId),
    index("idx_chats_folder_id").on(table.folderId),
    index("idx_chats_user_updated").on(table.userId, table.updatedAt),
  ]
);

// Notes (encrypted)
export const notes = pgTable(
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
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    pinned: boolean("pinned").default(false).notNull(),
    archived: boolean("archived").default(false).notNull(),
    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_notes_user_id").on(table.userId),
    index("idx_notes_folder_id").on(table.folderId),
    index("idx_notes_user_archived").on(table.userId, table.archived),
  ]
);

// Credentials (encrypted API keys)
export const credentials = pgTable(
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index("idx_credentials_user_id").on(table.userId)]
);

// Prompts (templates)
export const prompts = pgTable(
  "prompts",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
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
