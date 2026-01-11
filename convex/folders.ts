import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all folders for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const folders = await ctx.db
      .query("folders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Sort by name
    folders.sort((a, b) => a.name.localeCompare(b.name));

    return folders.map((folder) => ({
      id: folder._id,
      userId: folder.userId,
      name: folder.name,
      parentId: folder.parentId ?? null,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));
  },
});

/**
 * Get a specific folder by ID
 */
export const get = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    return {
      id: folder._id,
      userId: folder.userId,
      name: folder.name,
      parentId: folder.parentId ?? null,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  },
});

/**
 * Create a new folder
 */
export const create = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const folderId = await ctx.db.insert("folders", {
      userId,
      name: args.name,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });

    const folder = await ctx.db.get(folderId);
    return {
      id: folderId,
      userId: folder!.userId,
      name: folder!.name,
      parentId: folder!.parentId ?? null,
      createdAt: folder!.createdAt,
      updatedAt: folder!.updatedAt,
    };
  },
});

/**
 * Update an existing folder
 */
export const update = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.optional(v.string()),
    parentId: v.optional(v.union(v.id("folders"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.parentId !== undefined) updates.parentId = args.parentId;

    await ctx.db.patch(args.folderId, updates);

    const updated = await ctx.db.get(args.folderId);
    return {
      id: updated!._id,
      userId: updated!.userId,
      name: updated!.name,
      parentId: updated!.parentId ?? null,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  },
});

/**
 * Delete a folder (does not delete contents)
 */
export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.userId !== userId) {
      throw new Error("Folder not found");
    }

    await ctx.db.delete(args.folderId);
    return { success: true };
  },
});
