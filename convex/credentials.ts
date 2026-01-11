import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all credentials for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const credentials = await ctx.db
      .query("credentials")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return credentials.map((cred) => ({
      id: cred._id,
      provider: cred.provider,
      name: cred.name,
      encryptedData: cred.encryptedData,
      iv: cred.iv,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));
  },
});

/**
 * Create a new encrypted credential
 */
export const create = mutation({
  args: {
    provider: v.string(),
    name: v.string(),
    encryptedData: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const credId = await ctx.db.insert("credentials", {
      userId,
      provider: args.provider,
      name: args.name,
      encryptedData: args.encryptedData,
      iv: args.iv,
      createdAt: now,
      updatedAt: now,
    });

    const cred = await ctx.db.get(credId);
    return {
      id: credId,
      provider: cred!.provider,
      name: cred!.name,
      encryptedData: cred!.encryptedData,
      iv: cred!.iv,
      createdAt: cred!.createdAt,
      updatedAt: cred!.updatedAt,
    };
  },
});

/**
 * Update an existing credential
 */
export const update = mutation({
  args: {
    credentialId: v.id("credentials"),
    provider: v.string(),
    name: v.string(),
    encryptedData: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const cred = await ctx.db.get(args.credentialId);
    if (!cred || cred.userId !== userId) {
      throw new Error("Credential not found");
    }

    await ctx.db.patch(args.credentialId, {
      provider: args.provider,
      name: args.name,
      encryptedData: args.encryptedData,
      iv: args.iv,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(args.credentialId);
    return {
      id: updated!._id,
      provider: updated!.provider,
      name: updated!.name,
      encryptedData: updated!.encryptedData,
      iv: updated!.iv,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  },
});

/**
 * Delete a credential
 */
export const remove = mutation({
  args: { credentialId: v.id("credentials") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const cred = await ctx.db.get(args.credentialId);
    if (!cred || cred.userId !== userId) {
      throw new Error("Credential not found");
    }

    await ctx.db.delete(args.credentialId);
    return { success: true };
  },
});
