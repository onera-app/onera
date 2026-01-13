import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../../db/client";
import { credentials } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { broadcastToUser } from "../../websocket";

export const credentialsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, ctx.user.id))
      .orderBy(desc(credentials.createdAt));

    return result.map((credential) => ({
      id: credential.id,
      userId: credential.userId,
      provider: credential.provider,
      name: credential.name,
      encryptedData: credential.encryptedData,
      iv: credential.iv,
      createdAt: credential.createdAt.getTime(),
      updatedAt: credential.updatedAt.getTime(),
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        provider: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        encryptedData: z.string(),
        iv: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [credential] = await db
        .insert(credentials)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          name: input.name,
          encryptedData: input.encryptedData,
          iv: input.iv,
        })
        .returning();

      const result = {
        id: credential.id,
        userId: credential.userId,
        provider: credential.provider,
        name: credential.name,
        encryptedData: credential.encryptedData,
        iv: credential.iv,
        createdAt: credential.createdAt.getTime(),
        updatedAt: credential.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "credential:created", result);

      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        credentialId: z.string().uuid(),
        provider: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        encryptedData: z.string(),
        iv: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { credentialId, ...updates } = input;

      const [credential] = await db
        .update(credentials)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(credentials.id, credentialId),
            eq(credentials.userId, ctx.user.id)
          )
        )
        .returning();

      if (!credential) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      const result = {
        id: credential.id,
        userId: credential.userId,
        provider: credential.provider,
        name: credential.name,
        encryptedData: credential.encryptedData,
        iv: credential.iv,
        createdAt: credential.createdAt.getTime(),
        updatedAt: credential.updatedAt.getTime(),
      };

      broadcastToUser(ctx.user.id, "credential:updated", result);

      return result;
    }),

  remove: protectedProcedure
    .input(z.object({ credentialId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(credentials)
        .where(
          and(
            eq(credentials.id, input.credentialId),
            eq(credentials.userId, ctx.user.id)
          )
        );

      broadcastToUser(ctx.user.id, "credential:deleted", { id: input.credentialId });

      return { success: true };
    }),
});
