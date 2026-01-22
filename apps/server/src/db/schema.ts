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

    // Optional: Master key encrypted with password (Argon2id KEK) for SSO users without PRF
    encryptedMasterKeyWithPassword: text("encrypted_master_key_password"),
    masterKeyPasswordNonce: text("master_key_password_nonce"),
    passwordKekSalt: text("password_kek_salt"),
    passwordKekOpsLimit: integer("password_kek_ops_limit"),
    passwordKekMemLimit: integer("password_kek_mem_limit"),

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
    deviceName: text("device_name"), // Legacy plaintext name (e.g., "Chrome on MacBook")
    userAgent: text("user_agent"), // Browser user agent for identification

    // Encrypted device name (XSalsa20-Poly1305 with master key)
    encryptedDeviceName: text("encrypted_device_name"),
    deviceNameNonce: text("device_name_nonce"),

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

/**
 * WebAuthn credentials for passkey-based E2EE unlock
 *
 * Security model:
 * - PRF (Pseudo-Random Function) extension provides device-bound secret
 * - PRF output → HKDF → KEK (Key Encryption Key)
 * - KEK encrypts the master key (stored per-credential)
 * - Even with database access, attacker cannot decrypt without passkey+biometrics
 *
 * Each passkey stores its own encrypted copy of the master key because:
 * 1. PRF output is unique per credential
 * 2. Allows independent revocation without affecting other passkeys
 * 3. Cross-device passkeys (iCloud/Google) sync the credential, not the PRF output
 */
export const webauthnCredentials = pgTable(
  "webauthn_credentials",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull(), // Clerk user ID

    // WebAuthn credential data
    credentialId: text("credential_id").notNull(), // Base64URL encoded
    credentialPublicKey: text("credential_public_key").notNull(), // Base64URL encoded
    counter: integer("counter").notNull().default(0),
    credentialDeviceType: text("credential_device_type").notNull(), // "singleDevice" | "multiDevice"
    credentialBackedUp: boolean("credential_backed_up").default(false),
    transports: text("transports").array(), // ["internal", "hybrid", etc.]

    // PRF-encrypted master key (unique per credential due to unique PRF output)
    encryptedMasterKey: text("encrypted_master_key").notNull(), // Base64 encoded
    masterKeyNonce: text("master_key_nonce").notNull(), // Base64 encoded
    prfSalt: text("prf_salt").notNull(), // Base64 encoded, used in HKDF

    // User-friendly metadata
    // Legacy plaintext name (nullable - cleared when encrypted)
    name: text("name"), // e.g., "MacBook Pro Touch ID"

    // Encrypted name (XSalsa20-Poly1305 with master key)
    encryptedName: text("encrypted_name"),
    nameNonce: text("name_nonce"),

    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index("idx_webauthn_user_id").on(table.userId),
    uniqueIndex("idx_webauthn_credential_id").on(table.credentialId),
  ]
);

// ============================================
// Application Tables
// ============================================

// Folders (hierarchical, with encrypted names)
export const folders = pgTable(
  "folders",
  {
    id: uuidPrimaryKey("id"),
    userId: text("user_id").notNull(), // Clerk user ID

    // Legacy plaintext name (nullable - cleared when encrypted)
    name: text("name"),

    // Encrypted name (XSalsa20-Poly1305 with master key)
    encryptedName: text("encrypted_name"),
    nameNonce: text("name_nonce"),

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

    // Legacy plaintext fields (nullable - cleared when encrypted)
    provider: text("provider"),
    name: text("name"),

    // Encrypted name (XSalsa20-Poly1305 with master key)
    encryptedName: text("encrypted_name"),
    nameNonce: text("name_nonce"),

    // Encrypted provider (XSalsa20-Poly1305 with master key)
    encryptedProvider: text("encrypted_provider"),
    providerNonce: text("provider_nonce"),

    // Encrypted API key data (already encrypted)
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

    // Legacy plaintext fields (nullable - cleared when encrypted)
    name: text("name"),
    description: text("description"),
    content: text("content"),

    // Encrypted name (XSalsa20-Poly1305 with master key)
    encryptedName: text("encrypted_name"),
    nameNonce: text("name_nonce"),

    // Encrypted description (XSalsa20-Poly1305 with master key)
    encryptedDescription: text("encrypted_description"),
    descriptionNonce: text("description_nonce"),

    // Encrypted content (XSalsa20-Poly1305 with master key)
    encryptedContent: text("encrypted_content"),
    contentNonce: text("content_nonce"),

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
export type WebauthnCredential = typeof webauthnCredentials.$inferSelect;
export type NewWebauthnCredential = typeof webauthnCredentials.$inferInsert;
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
