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
// Clerk Auth - No tables needed (managed by Clerk)
// User ID is the Clerk user ID (string like "user_xxx")
// ============================================

// ============================================
// Key Shares (E2EE with 3-share system)
// ============================================

/**
 * Key shares for the 3-share E2EE system (Privy-style server-protected)
 *
 * Security model:
 * - Auth share: Stored as PLAINTEXT on server, protected by Clerk authentication
 *   The server only releases the auth share to authenticated Clerk sessions.
 *   Even with database access, an attacker cannot decrypt user data without
 *   also compromising Clerk authentication.
 * - Device share: Stored encrypted in localStorage (not in DB)
 * - Recovery share: Stored encrypted with recovery key derived from mnemonic
 *
 * To decrypt user data, an attacker must compromise THREE independent systems:
 * 1. Database (auth share + recovery share)
 * 2. Device (device share in localStorage)
 * 3. Clerk authentication (valid session token)
 */
export const keyShares = pgTable(
  "key_shares",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull().unique(), // Clerk user ID (e.g., "user_2abc123")

    // Auth share (plaintext, protected by Clerk session authentication)
    // Security: Only released via tRPC protectedProcedure to authenticated users
    authShare: text("auth_share").notNull(),

    // Recovery share (encrypted with recovery key derived from mnemonic)
    encryptedRecoveryShare: text("encrypted_recovery_share").notNull(),
    recoveryShareNonce: text("recovery_share_nonce").notNull(),

    // Key pair
    publicKey: text("public_key").notNull(),
    encryptedPrivateKey: text("encrypted_private_key").notNull(),
    privateKeyNonce: text("private_key_nonce").notNull(),

    // Master key encrypted with recovery key (for recovery phrase-based unlock)
    masterKeyRecovery: text("master_key_recovery").notNull(),
    masterKeyRecoveryNonce: text("master_key_recovery_nonce").notNull(),

    // Recovery key encrypted with master key (for viewing recovery phrase later)
    encryptedRecoveryKey: text("encrypted_recovery_key").notNull(),
    recoveryKeyNonce: text("recovery_key_nonce").notNull(),

    // Share version for rotation tracking
    shareVersion: integer("share_version").default(1).notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [uniqueIndex("idx_key_shares_user_id").on(table.userId)]
);

/**
 * Registered devices for each user
 * Tracks devices that have been authorized to access the E2EE keys
 *
 * Security: deviceSecret provides server-side entropy for device share encryption.
 * The device share encryption key = BLAKE2b(deviceId + fingerprint + deviceSecret)
 * This prevents attackers with just localStorage access from decrypting the device share.
 */
export const devices = pgTable(
  "devices",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull(), // Clerk user ID
    deviceId: text("device_id").notNull(), // Browser-generated device ID
    deviceName: text("device_name"), // User-friendly name (e.g., "Chrome on MacBook")
    userAgent: text("user_agent"), // Browser user agent for identification

    // Server-generated entropy for device share encryption
    // Combined with deviceId + fingerprint to derive the device share encryption key
    deviceSecret: text("device_secret").notNull(),

    // Trust status
    trusted: boolean("trusted").default(true).notNull(),

    // Activity tracking
    lastSeenAt: timestamp("last_seen_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_devices_user_id").on(table.userId),
    uniqueIndex("idx_devices_user_device").on(table.userId, table.deviceId),
  ]
);

// ============================================
// Application Tables
// ============================================

// Folders (hierarchical)
export const folders = pgTable(
  "folders",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull(), // Clerk user ID
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
// Note: titlePreview was removed for security - all chat content is E2EE encrypted
export const chats = pgTable(
  "chats",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull(), // Clerk user ID
    // Encryption metadata
    isEncrypted: boolean("is_encrypted").default(true).notNull(),
    encryptedChatKey: text("encrypted_chat_key"),
    chatKeyNonce: text("chat_key_nonce"),
    // Encrypted content
    encryptedTitle: text("encrypted_title"),
    titleNonce: text("title_nonce"),
    encryptedChat: text("encrypted_chat"),
    chatNonce: text("chat_nonce"),
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
    userId: text("user_id").notNull(), // Clerk user ID
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
    userId: text("user_id").notNull(), // Clerk user ID
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
    userId: text("user_id").notNull(), // Clerk user ID
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

// ============================================
// Legacy Tables (for migration compatibility)
// DEPRECATED: Will be removed after migration
// ============================================

// Legacy user encryption keys (Better Auth style)
export const userKeys = pgTable(
  "user_keys",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull().unique(),
    // KEK derivation params (Better Auth style)
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

// ============================================
// Type exports
// ============================================

export type KeyShare = typeof keyShares.$inferSelect;
export type NewKeyShare = typeof keyShares.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
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

// Legacy types (for migration)
export type UserKey = typeof userKeys.$inferSelect;
export type NewUserKey = typeof userKeys.$inferInsert;
