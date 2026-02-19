import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, notes } from "../../db/client";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastToUser } from "../../websocket";

export const notesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        folderId: z.string().uuid().optional(),
        archived: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let result = await db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.userId, ctx.user.id),
            eq(notes.archived, input?.archived ?? false)
          )
        )
        .orderBy(desc(notes.updatedAt));

      // Filter by folderId if provided
      if (input?.folderId) {
        result = result.filter((note) => note.folderId === input.folderId);
      }

      return result.map((note) => ({
        id: note.id,
        userId: note.userId,
        encryptedNoteKey: note.encryptedNoteKey,
        noteKeyNonce: note.noteKeyNonce,
        encryptedTitle: note.encryptedTitle,
        titleNonce: note.titleNonce,
        encryptedContent: note.encryptedContent,
        contentNonce: note.contentNonce,
        folderId: note.folderId,
        pinned: note.pinned,
        archived: note.archived,
        createdAt: note.createdAt.getTime(),
        updatedAt: note.updatedAt.getTime(),
      }));
    }),

  get: protectedProcedure
    .input(z.object({ noteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      return {
        id: note.id,
        userId: note.userId,
        encryptedNoteKey: note.encryptedNoteKey,
        noteKeyNonce: note.noteKeyNonce,
        encryptedTitle: note.encryptedTitle,
        titleNonce: note.titleNonce,
        encryptedContent: note.encryptedContent,
        contentNonce: note.contentNonce,
        folderId: note.folderId,
        pinned: note.pinned,
        archived: note.archived,
        createdAt: note.createdAt.getTime(),
        updatedAt: note.updatedAt.getTime(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        noteId: z.string().uuid().optional(),
        encryptedNoteKey: z.string().optional(),
        noteKeyNonce: z.string().optional(),
        encryptedTitle: z.string(),
        titleNonce: z.string(),
        encryptedContent: z.string(),
        contentNonce: z.string(),
        folderId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [note] = await db
        .insert(notes)
        .values({
          id: input.noteId,
          userId: ctx.user.id,
          encryptedNoteKey: input.encryptedNoteKey,
          noteKeyNonce: input.noteKeyNonce,
          encryptedTitle: input.encryptedTitle,
          titleNonce: input.titleNonce,
          encryptedContent: input.encryptedContent,
          contentNonce: input.contentNonce,
          folderId: input.folderId,
          pinned: false,
          archived: false,
        })
        .returning();

      const result = {
        id: note.id,
        userId: note.userId,
        encryptedNoteKey: note.encryptedNoteKey,
        noteKeyNonce: note.noteKeyNonce,
        encryptedTitle: note.encryptedTitle,
        titleNonce: note.titleNonce,
        encryptedContent: note.encryptedContent,
        contentNonce: note.contentNonce,
        folderId: note.folderId,
        pinned: note.pinned,
        archived: note.archived,
        createdAt: note.createdAt.getTime(),
        updatedAt: note.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "note:created", result);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        noteId: z.string().uuid(),
        encryptedNoteKey: z.string().optional(),
        noteKeyNonce: z.string().optional(),
        encryptedTitle: z.string().optional(),
        titleNonce: z.string().optional(),
        encryptedContent: z.string().optional(),
        contentNonce: z.string().optional(),
        folderId: z.string().uuid().nullable().optional(),
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { noteId, ...updates } = input;

      const [note] = await db
        .update(notes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(notes.id, noteId), eq(notes.userId, ctx.user.id)))
        .returning();

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found" });
      }

      const result = {
        id: note.id,
        userId: note.userId,
        encryptedNoteKey: note.encryptedNoteKey,
        noteKeyNonce: note.noteKeyNonce,
        encryptedTitle: note.encryptedTitle,
        titleNonce: note.titleNonce,
        encryptedContent: note.encryptedContent,
        contentNonce: note.contentNonce,
        folderId: note.folderId,
        pinned: note.pinned,
        archived: note.archived,
        createdAt: note.createdAt.getTime(),
        updatedAt: note.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "note:updated", result);

      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ noteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(notes)
        .where(and(eq(notes.id, input.noteId), eq(notes.userId, ctx.user.id)));

      broadcastToUser(ctx.user.id, "note:deleted", { id: input.noteId });

      return { success: true };
    }),
});
