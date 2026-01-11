import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all prompts for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return prompts.map((prompt) => ({
      id: prompt._id,
      userId: prompt.userId,
      name: prompt.name,
      description: prompt.description ?? null,
      content: prompt.content,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }));
  },
});

/**
 * Get a specific prompt by ID
 */
export const get = query({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.userId !== userId) {
      throw new Error("Prompt not found");
    }

    return {
      id: prompt._id,
      userId: prompt.userId,
      name: prompt.name,
      description: prompt.description ?? null,
      content: prompt.content,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  },
});

/**
 * Create a new prompt
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const promptId = await ctx.db.insert("prompts", {
      userId,
      name: args.name,
      description: args.description,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });

    const prompt = await ctx.db.get(promptId);
    return {
      id: promptId,
      userId: prompt!.userId,
      name: prompt!.name,
      description: prompt!.description ?? null,
      content: prompt!.content,
      createdAt: prompt!.createdAt,
      updatedAt: prompt!.updatedAt,
    };
  },
});

/**
 * Update an existing prompt
 */
export const update = mutation({
  args: {
    promptId: v.id("prompts"),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.userId !== userId) {
      throw new Error("Prompt not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.content !== undefined) updates.content = args.content;

    await ctx.db.patch(args.promptId, updates);

    const updated = await ctx.db.get(args.promptId);
    return {
      id: updated!._id,
      userId: updated!.userId,
      name: updated!.name,
      description: updated!.description ?? null,
      content: updated!.content,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  },
});

/**
 * Delete a prompt
 */
export const remove = mutation({
  args: { promptId: v.id("prompts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const prompt = await ctx.db.get(args.promptId);
    if (!prompt || prompt.userId !== userId) {
      throw new Error("Prompt not found");
    }

    await ctx.db.delete(args.promptId);
    return { success: true };
  },
});
