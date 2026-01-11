import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Extend the users table from authTables with our custom fields
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"]),

  // E2EE key storage - one per user
  userKeys: defineTable({
    userId: v.id("users"),
    // KEK derivation params
    kekSalt: v.string(),
    kekOpsLimit: v.number(),
    kekMemLimit: v.number(),
    // Encrypted master key (encrypted by KEK)
    encryptedMasterKey: v.string(),
    masterKeyNonce: v.string(),
    // Public/private key pair
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
    privateKeyNonce: v.string(),
    // Recovery key (encrypted by master key)
    encryptedRecoveryKey: v.string(),
    recoveryKeyNonce: v.string(),
    // Master key encrypted by recovery key (for account recovery)
    masterKeyRecovery: v.string(),
    masterKeyRecoveryNonce: v.string(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Encrypted chat data
  chats: defineTable({
    userId: v.id("users"),
    // Encryption metadata
    isEncrypted: v.boolean(),
    encryptedChatKey: v.optional(v.string()),
    chatKeyNonce: v.optional(v.string()),
    // Encrypted content
    encryptedTitle: v.optional(v.string()),
    titleNonce: v.optional(v.string()),
    encryptedChat: v.optional(v.string()),
    chatNonce: v.optional(v.string()),
    // Plaintext preview for locked state
    titlePreview: v.optional(v.string()),
    // Organization
    folderId: v.optional(v.id("folders")),
    pinned: v.boolean(),
    archived: v.boolean(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"])
    .index("by_folderId", ["folderId"]),

  // Encrypted LLM API credentials
  credentials: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    name: v.string(),
    // Encrypted credential data
    encryptedData: v.string(),
    iv: v.string(),
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Hierarchical folder organization
  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("folders")),
    // Timestamps (milliseconds)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_parentId", ["parentId"]),

  // Encrypted notes
  notes: defineTable({
    userId: v.id("users"),
    // Encrypted content
    encryptedTitle: v.string(),
    titleNonce: v.string(),
    encryptedContent: v.string(),
    contentNonce: v.string(),
    // Metadata
    folderId: v.optional(v.id("folders")),
    pinned: v.boolean(),
    archived: v.boolean(),
    // Timestamps (milliseconds)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_folderId", ["folderId"])
    .index("by_userId_archived", ["userId", "archived"]),

  // Prompt templates
  prompts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    // Timestamps (milliseconds)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),
});
