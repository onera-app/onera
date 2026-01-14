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
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
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
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
        createdAt: prompt.createdAt.getTime(),
        updatedAt: prompt.updatedAt.getTime(),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [prompt] = await db
        .insert(prompts)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          content: input.content,
        })
        .returning();

      const result = {
        id: prompt.id,
        userId: prompt.userId,
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
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
        name: z.string().min(1).max(255).optional(),
        description: z.string().nullable().optional(),
        content: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { promptId, ...updates } = input;

      const [prompt] = await db
        .update(prompts)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(and(eq(prompts.id, promptId), eq(prompts.userId, ctx.user.id)))
        .returning();

      if (!prompt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      }

      const result = {
        id: prompt.id,
        userId: prompt.userId,
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
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
