import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List notes for the current user
 */
export const list = query({
  args: {
    folderId: v.optional(v.id("folders")),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const archived = args.archived ?? false;

    let notes = await ctx.db
      .query("notes")
      .withIndex("by_userId_archived", (q) =>
        q.eq("userId", userId).eq("archived", archived)
      )
      .order("desc")
      .collect();

    // Filter by folder if specified
    if (args.folderId !== undefined) {
      notes = notes.filter((note) => note.folderId === args.folderId);
    }

    return notes.map((note) => ({
      id: note._id,
      userId: note.userId,
      encryptedTitle: note.encryptedTitle,
      titleNonce: note.titleNonce,
      encryptedContent: note.encryptedContent,
      contentNonce: note.contentNonce,
      folderId: note.folderId ?? null,
      pinned: note.pinned,
      archived: note.archived,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }));
  },
});

/**
 * Get a specific note by ID
 */
export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    return {
      id: note._id,
      userId: note.userId,
      encryptedTitle: note.encryptedTitle,
      titleNonce: note.titleNonce,
      encryptedContent: note.encryptedContent,
      contentNonce: note.contentNonce,
      folderId: note.folderId ?? null,
      pinned: note.pinned,
      archived: note.archived,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  },
});

/**
 * Create a new encrypted note
 */
export const create = mutation({
  args: {
    encryptedTitle: v.string(),
    titleNonce: v.string(),
    encryptedContent: v.string(),
    contentNonce: v.string(),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      userId,
      encryptedTitle: args.encryptedTitle,
      titleNonce: args.titleNonce,
      encryptedContent: args.encryptedContent,
      contentNonce: args.contentNonce,
      folderId: args.folderId,
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    const note = await ctx.db.get(noteId);
    return {
      id: noteId,
      userId: note!.userId,
      encryptedTitle: note!.encryptedTitle,
      titleNonce: note!.titleNonce,
      encryptedContent: note!.encryptedContent,
      contentNonce: note!.contentNonce,
      folderId: note!.folderId ?? null,
      pinned: note!.pinned,
      archived: note!.archived,
      createdAt: note!.createdAt,
      updatedAt: note!.updatedAt,
    };
  },
});

/**
 * Update an existing note
 */
export const update = mutation({
  args: {
    noteId: v.id("notes"),
    encryptedTitle: v.optional(v.string()),
    titleNonce: v.optional(v.string()),
    encryptedContent: v.optional(v.string()),
    contentNonce: v.optional(v.string()),
    folderId: v.optional(v.union(v.id("folders"), v.null())),
    pinned: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.encryptedTitle !== undefined) updates.encryptedTitle = args.encryptedTitle;
    if (args.titleNonce !== undefined) updates.titleNonce = args.titleNonce;
    if (args.encryptedContent !== undefined) updates.encryptedContent = args.encryptedContent;
    if (args.contentNonce !== undefined) updates.contentNonce = args.contentNonce;
    if (args.folderId !== undefined) updates.folderId = args.folderId;
    if (args.pinned !== undefined) updates.pinned = args.pinned;
    if (args.archived !== undefined) updates.archived = args.archived;

    await ctx.db.patch(args.noteId, updates);

    const updated = await ctx.db.get(args.noteId);
    return {
      id: updated!._id,
      userId: updated!.userId,
      encryptedTitle: updated!.encryptedTitle,
      titleNonce: updated!.titleNonce,
      encryptedContent: updated!.encryptedContent,
      contentNonce: updated!.contentNonce,
      folderId: updated!.folderId ?? null,
      pinned: updated!.pinned,
      archived: updated!.archived,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  },
});

/**
 * Delete a note
 */
export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    await ctx.db.delete(args.noteId);
    return { success: true };
  },
});
