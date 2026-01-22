import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, prompts } from "../../db/client";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastToUser } from "../../websocket";

export const promptsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(prompts)
      .where(eq(prompts.userId, ctx.user.id))
      .orderBy(desc(prompts.createdAt));

    return result.map((prompt) => ({
      id: prompt.id,
      userId: prompt.userId,
      encryptedName: prompt.encryptedName,
      nameNonce: prompt.nameNonce,
      encryptedDescription: prompt.encryptedDescription,
      descriptionNonce: prompt.descriptionNonce,
      encryptedContent: prompt.encryptedContent,
      contentNonce: prompt.contentNonce,
      createdAt: prompt.createdAt.getTime(),
      updatedAt: prompt.updatedAt.getTime(),
    }));
  }),

  get: protectedProcedure
    .input(z.object({ promptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [prompt] = await db
        .select()
        .from(prompts)
        .where(
          and(eq(prompts.id, input.promptId), eq(prompts.userId, ctx.user.id))
        );

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      return {
        id: prompt.id,
        userId: prompt.userId,
        encryptedName: prompt.encryptedName,
        nameNonce: prompt.nameNonce,
        encryptedDescription: prompt.encryptedDescription,
        descriptionNonce: prompt.descriptionNonce,
        encryptedContent: prompt.encryptedContent,
        contentNonce: prompt.contentNonce,
        createdAt: prompt.createdAt.getTime(),
        updatedAt: prompt.updatedAt.getTime(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        // Encrypted fields (required for new prompts)
        encryptedName: z.string(),
        nameNonce: z.string(),
        encryptedDescription: z.string().optional(),
        descriptionNonce: z.string().optional(),
        encryptedContent: z.string(),
        contentNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await db
        .insert(prompts)
        .values({
          userId: ctx.user.id,
          encryptedName: input.encryptedName,
          nameNonce: input.nameNonce,
          encryptedDescription: input.encryptedDescription,
          descriptionNonce: input.descriptionNonce,
          encryptedContent: input.encryptedContent,
          contentNonce: input.contentNonce,
        })
        .returning();

      const result = {
        id: prompt.id,
        userId: prompt.userId,
        encryptedName: prompt.encryptedName,
        nameNonce: prompt.nameNonce,
        encryptedDescription: prompt.encryptedDescription,
        descriptionNonce: prompt.descriptionNonce,
        encryptedContent: prompt.encryptedContent,
        contentNonce: prompt.contentNonce,
        createdAt: prompt.createdAt.getTime(),
        updatedAt: prompt.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "prompt:created", result);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        promptId: z.string().uuid(),
        // Encrypted fields
        encryptedName: z.string().optional(),
        nameNonce: z.string().optional(),
        encryptedDescription: z.string().nullable().optional(),
        descriptionNonce: z.string().nullable().optional(),
        encryptedContent: z.string().optional(),
        contentNonce: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { promptId, ...inputUpdates } = input;

      const updates: Record<string, any> = {
        updatedAt: new Date(),
      };

      // If updating name, always use encrypted
      if (inputUpdates.encryptedName && inputUpdates.nameNonce) {
        updates.encryptedName = inputUpdates.encryptedName;
        updates.nameNonce = inputUpdates.nameNonce;
      }

      // If updating description, always use encrypted
      if (inputUpdates.encryptedDescription !== undefined && inputUpdates.descriptionNonce !== undefined) {
        updates.encryptedDescription = inputUpdates.encryptedDescription;
        updates.descriptionNonce = inputUpdates.descriptionNonce;
      }

      // If updating content, always use encrypted
      if (inputUpdates.encryptedContent && inputUpdates.contentNonce) {
        updates.encryptedContent = inputUpdates.encryptedContent;
        updates.contentNonce = inputUpdates.contentNonce;
      }

      const [prompt] = await db
        .update(prompts)
        .set(updates)
        .where(and(eq(prompts.id, promptId), eq(prompts.userId, ctx.user.id)))
        .returning();

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      const result = {
        id: prompt.id,
        userId: prompt.userId,
        encryptedName: prompt.encryptedName,
        nameNonce: prompt.nameNonce,
        encryptedDescription: prompt.encryptedDescription,
        descriptionNonce: prompt.descriptionNonce,
        encryptedContent: prompt.encryptedContent,
        contentNonce: prompt.contentNonce,
        createdAt: prompt.createdAt.getTime(),
        updatedAt: prompt.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "prompt:updated", result);

      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ promptId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(prompts)
        .where(
          and(eq(prompts.id, input.promptId), eq(prompts.userId, ctx.user.id))
        );

      broadcastToUser(ctx.user.id, "prompt:deleted", { id: input.promptId });

      return { success: true };
    }),
});
