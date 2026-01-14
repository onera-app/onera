import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, folders } from "../../db/client";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastToUser } from "../../websocket";

export const foldersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(folders)
      .where(eq(folders.userId, ctx.user.id))
      .orderBy(asc(folders.name));

    return result.map((folder) => ({
      id: folder.id,
      userId: folder.userId,
      name: folder.name,
      parentId: folder.parentId,
      createdAt: folder.createdAt.getTime(),
      updatedAt: folder.updatedAt.getTime(),
    }));
  }),

  get: protectedProcedure
    .input(z.object({ folderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [folder] = await db
        .select()
        .from(folders)
        .where(
          and(eq(folders.id, input.folderId), eq(folders.userId, ctx.user.id))
        );

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      return {
        id: folder.id,
        userId: folder.userId,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt.getTime(),
        updatedAt: folder.updatedAt.getTime(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [folder] = await db
        .insert(folders)
        .values({
          userId: ctx.user.id,
          name: input.name,
          parentId: input.parentId,
        })
        .returning();

      const result = {
        id: folder.id,
        userId: folder.userId,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt.getTime(),
        updatedAt: folder.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "folder:created", result);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        folderId: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        parentId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { folderId, ...updates } = input;

      const [folder] = await db
        .update(folders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(folders.id, folderId), eq(folders.userId, ctx.user.id)))
        .returning();

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      const result = {
        id: folder.id,
        userId: folder.userId,
        name: folder.name,
        parentId: folder.parentId,
        createdAt: folder.createdAt.getTime(),
        updatedAt: folder.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "folder:updated", result);

      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ folderId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(folders)
        .where(
          and(eq(folders.id, input.folderId), eq(folders.userId, ctx.user.id))
        );

      broadcastToUser(ctx.user.id, "folder:deleted", { id: input.folderId });

      return { success: true };
    }),
});
