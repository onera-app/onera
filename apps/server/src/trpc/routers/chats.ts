import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, chats } from "../../db/client";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastToUser } from "../../websocket";

export const chatsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, ctx.user.id))
      .orderBy(desc(chats.updatedAt));

    return result.map((chat) => ({
      id: chat.id,
      userId: chat.userId,
      isEncrypted: chat.isEncrypted,
      encryptedChatKey: chat.encryptedChatKey ?? "",
      chatKeyNonce: chat.chatKeyNonce ?? "",
      encryptedTitle: chat.encryptedTitle ?? "",
      titleNonce: chat.titleNonce ?? "",
      folderId: chat.folderId,
      pinned: chat.pinned,
      archived: chat.archived,
      createdAt: chat.createdAt.getTime(),
      updatedAt: chat.updatedAt.getTime(),
    }));
  }),

  get: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [chat] = await db
        .select()
        .from(chats)
        .where(and(eq(chats.id, input.chatId), eq(chats.userId, ctx.user.id)));

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      }

      return {
        id: chat.id,
        userId: chat.userId,
        isEncrypted: chat.isEncrypted,
        encryptedChatKey: chat.encryptedChatKey ?? "",
        chatKeyNonce: chat.chatKeyNonce ?? "",
        encryptedTitle: chat.encryptedTitle ?? "",
        titleNonce: chat.titleNonce ?? "",
        encryptedChat: chat.encryptedChat ?? "",
        chatNonce: chat.chatNonce ?? "",
        folderId: chat.folderId,
        pinned: chat.pinned,
        archived: chat.archived,
        createdAt: chat.createdAt.getTime(),
        updatedAt: chat.updatedAt.getTime(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        encryptedChatKey: z.string(),
        chatKeyNonce: z.string(),
        encryptedTitle: z.string(),
        titleNonce: z.string(),
        encryptedChat: z.string(),
        chatNonce: z.string(),
        folderId: z.string().uuid().optional(),
        id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [chat] = await db
        .insert(chats)
        .values({
          ...(input.id ? { id: input.id } : {}),
          userId: ctx.user.id,
          isEncrypted: true,
          encryptedChatKey: input.encryptedChatKey,
          chatKeyNonce: input.chatKeyNonce,
          encryptedTitle: input.encryptedTitle,
          titleNonce: input.titleNonce,
          encryptedChat: input.encryptedChat,
          chatNonce: input.chatNonce,
          folderId: input.folderId,
          pinned: false,
          archived: false,
        })
        .returning();

      const result = {
        id: chat.id,
        userId: chat.userId,
        isEncrypted: chat.isEncrypted,
        encryptedChatKey: chat.encryptedChatKey ?? "",
        chatKeyNonce: chat.chatKeyNonce ?? "",
        encryptedTitle: chat.encryptedTitle ?? "",
        titleNonce: chat.titleNonce ?? "",
        encryptedChat: chat.encryptedChat ?? "",
        chatNonce: chat.chatNonce ?? "",
        folderId: chat.folderId,
        pinned: chat.pinned,
        archived: chat.archived,
        createdAt: chat.createdAt.getTime(),
        updatedAt: chat.updatedAt.getTime(),
      };

      // Broadcast real-time update
      broadcastToUser(ctx.user.id, "chat:created", result);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        encryptedTitle: z.string().optional(),
        titleNonce: z.string().optional(),
        encryptedChat: z.string().optional(),
        chatNonce: z.string().optional(),
        folderId: z.string().uuid().nullable().optional(),
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { chatId, ...updates } = input;

      const [chat] = await db
        .update(chats)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(chats.id, chatId), eq(chats.userId, ctx.user.id)))
        .returning();

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      }

      const result = {
        id: chat.id,
        userId: chat.userId,
        isEncrypted: chat.isEncrypted,
        encryptedChatKey: chat.encryptedChatKey ?? "",
        chatKeyNonce: chat.chatKeyNonce ?? "",
        encryptedTitle: chat.encryptedTitle ?? "",
        titleNonce: chat.titleNonce ?? "",
        encryptedChat: chat.encryptedChat ?? "",
        chatNonce: chat.chatNonce ?? "",
        folderId: chat.folderId,
        pinned: chat.pinned,
        archived: chat.archived,
        createdAt: chat.createdAt.getTime(),
        updatedAt: chat.updatedAt.getTime(),
      };

      // Broadcast real-time update
      broadcastToUser(ctx.user.id, "chat:updated", result);

      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ chatId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(chats)
        .where(and(eq(chats.id, input.chatId), eq(chats.userId, ctx.user.id)));

      // Broadcast real-time update
      broadcastToUser(ctx.user.id, "chat:deleted", { id: input.chatId });

      return { success: true };
    }),
});
