import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List all chats for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return chats.map((chat) => ({
      id: chat._id,
      userId: chat.userId,
      encryptedTitle: chat.encryptedTitle ?? "",
      titleNonce: chat.titleNonce ?? "",
      encryptedChatKey: chat.encryptedChatKey ?? "",
      chatKeyNonce: chat.chatKeyNonce ?? "",
      folderId: chat.folderId ?? null,
      pinned: chat.pinned,
      archived: chat.archived,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));
  },
});

/**
 * Get a specific chat by ID
 */
export const get = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    return {
      id: chat._id,
      userId: chat.userId,
      encryptedChatKey: chat.encryptedChatKey ?? "",
      chatKeyNonce: chat.chatKeyNonce ?? "",
      encryptedTitle: chat.encryptedTitle ?? "",
      titleNonce: chat.titleNonce ?? "",
      encryptedChat: chat.encryptedChat ?? "",
      chatNonce: chat.chatNonce ?? "",
      folderId: chat.folderId ?? null,
      pinned: chat.pinned,
      archived: chat.archived,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  },
});

/**
 * Create a new encrypted chat
 */
export const create = mutation({
  args: {
    encryptedChatKey: v.string(),
    chatKeyNonce: v.string(),
    encryptedTitle: v.string(),
    titleNonce: v.string(),
    encryptedChat: v.string(),
    chatNonce: v.string(),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      userId,
      isEncrypted: true,
      encryptedChatKey: args.encryptedChatKey,
      chatKeyNonce: args.chatKeyNonce,
      encryptedTitle: args.encryptedTitle,
      titleNonce: args.titleNonce,
      encryptedChat: args.encryptedChat,
      chatNonce: args.chatNonce,
      folderId: args.folderId,
      pinned: false,
      archived: false,
      createdAt: now,
      updatedAt: now,
    });

    const chat = await ctx.db.get(chatId);
    return {
      id: chatId,
      userId: chat!.userId,
      encryptedChatKey: chat!.encryptedChatKey ?? "",
      chatKeyNonce: chat!.chatKeyNonce ?? "",
      encryptedTitle: chat!.encryptedTitle ?? "",
      titleNonce: chat!.titleNonce ?? "",
      encryptedChat: chat!.encryptedChat ?? "",
      chatNonce: chat!.chatNonce ?? "",
      folderId: chat!.folderId ?? null,
      pinned: chat!.pinned,
      archived: chat!.archived,
      createdAt: chat!.createdAt,
      updatedAt: chat!.updatedAt,
    };
  },
});

/**
 * Update an existing chat
 */
export const update = mutation({
  args: {
    chatId: v.id("chats"),
    encryptedTitle: v.optional(v.string()),
    titleNonce: v.optional(v.string()),
    encryptedChat: v.optional(v.string()),
    chatNonce: v.optional(v.string()),
    folderId: v.optional(v.union(v.id("folders"), v.null())),
    pinned: v.optional(v.boolean()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.encryptedTitle !== undefined) updates.encryptedTitle = args.encryptedTitle;
    if (args.titleNonce !== undefined) updates.titleNonce = args.titleNonce;
    if (args.encryptedChat !== undefined) updates.encryptedChat = args.encryptedChat;
    if (args.chatNonce !== undefined) updates.chatNonce = args.chatNonce;
    if (args.folderId !== undefined) updates.folderId = args.folderId;
    if (args.pinned !== undefined) updates.pinned = args.pinned;
    if (args.archived !== undefined) updates.archived = args.archived;

    await ctx.db.patch(args.chatId, updates);

    const updated = await ctx.db.get(args.chatId);
    return {
      id: updated!._id,
      userId: updated!.userId,
      encryptedChatKey: updated!.encryptedChatKey ?? "",
      chatKeyNonce: updated!.chatKeyNonce ?? "",
      encryptedTitle: updated!.encryptedTitle ?? "",
      titleNonce: updated!.titleNonce ?? "",
      encryptedChat: updated!.encryptedChat ?? "",
      chatNonce: updated!.chatNonce ?? "",
      folderId: updated!.folderId ?? null,
      pinned: updated!.pinned,
      archived: updated!.archived,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    };
  },
});

/**
 * Delete a chat
 */
export const remove = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(args.chatId);
    return { success: true };
  },
});
