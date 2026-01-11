import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Check if user has E2EE keys set up
 */
export const check = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const keys = await ctx.db
      .query("userKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return { hasKeys: keys !== null };
  },
});

/**
 * Get user's E2EE key material
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const keys = await ctx.db
      .query("userKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!keys) {
      return null;
    }

    return {
      kekSalt: keys.kekSalt,
      kekOpsLimit: keys.kekOpsLimit,
      kekMemLimit: keys.kekMemLimit,
      encryptedMasterKey: keys.encryptedMasterKey,
      masterKeyNonce: keys.masterKeyNonce,
      publicKey: keys.publicKey,
      encryptedPrivateKey: keys.encryptedPrivateKey,
      privateKeyNonce: keys.privateKeyNonce,
      encryptedRecoveryKey: keys.encryptedRecoveryKey,
      recoveryKeyNonce: keys.recoveryKeyNonce,
      masterKeyRecovery: keys.masterKeyRecovery,
      masterKeyRecoveryNonce: keys.masterKeyRecoveryNonce,
    };
  },
});

/**
 * Create new user encryption key setup
 */
export const create = mutation({
  args: {
    kekSalt: v.string(),
    kekOpsLimit: v.number(),
    kekMemLimit: v.number(),
    encryptedMasterKey: v.string(),
    masterKeyNonce: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
    privateKeyNonce: v.string(),
    encryptedRecoveryKey: v.string(),
    recoveryKeyNonce: v.string(),
    masterKeyRecovery: v.string(),
    masterKeyRecoveryNonce: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Check if keys already exist
    const existing = await ctx.db
      .query("userKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      throw new Error("User keys already exist");
    }

    const now = Date.now();
    await ctx.db.insert("userKeys", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Update key material (for password changes)
 */
export const update = mutation({
  args: {
    kekSalt: v.optional(v.string()),
    kekOpsLimit: v.optional(v.number()),
    kekMemLimit: v.optional(v.number()),
    encryptedMasterKey: v.optional(v.string()),
    masterKeyNonce: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const keys = await ctx.db
      .query("userKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!keys) {
      throw new Error("User keys not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.kekSalt !== undefined) updates.kekSalt = args.kekSalt;
    if (args.kekOpsLimit !== undefined) updates.kekOpsLimit = args.kekOpsLimit;
    if (args.kekMemLimit !== undefined) updates.kekMemLimit = args.kekMemLimit;
    if (args.encryptedMasterKey !== undefined) updates.encryptedMasterKey = args.encryptedMasterKey;
    if (args.masterKeyNonce !== undefined) updates.masterKeyNonce = args.masterKeyNonce;

    await ctx.db.patch(keys._id, updates);

    return { success: true };
  },
});
