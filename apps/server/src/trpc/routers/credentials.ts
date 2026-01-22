import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, credentials } from "../../db/client";
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
      // Encrypted metadata fields
      encryptedName: credential.encryptedName,
      nameNonce: credential.nameNonce,
      encryptedProvider: credential.encryptedProvider,
      providerNonce: credential.providerNonce,
      // Encrypted API key data
      encryptedData: credential.encryptedData,
      iv: credential.iv,
      createdAt: credential.createdAt.getTime(),
      updatedAt: credential.updatedAt.getTime(),
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        // Encrypted metadata fields (required for new credentials)
        encryptedName: z.string(),
        nameNonce: z.string(),
        encryptedProvider: z.string(),
        providerNonce: z.string(),
        // Encrypted API key data
        encryptedData: z.string(),
        iv: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [credential] = await db
        .insert(credentials)
        .values({
          userId: ctx.user.id,
          encryptedName: input.encryptedName,
          nameNonce: input.nameNonce,
          encryptedProvider: input.encryptedProvider,
          providerNonce: input.providerNonce,
          encryptedData: input.encryptedData,
          iv: input.iv,
        })
        .returning();

      const result = {
        id: credential.id,
        userId: credential.userId,
        encryptedName: credential.encryptedName,
        nameNonce: credential.nameNonce,
        encryptedProvider: credential.encryptedProvider,
        providerNonce: credential.providerNonce,
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
        // Encrypted metadata fields
        encryptedName: z.string().optional(),
        nameNonce: z.string().optional(),
        encryptedProvider: z.string().optional(),
        providerNonce: z.string().optional(),
        // Encrypted API key data
        encryptedData: z.string().optional(),
        iv: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { credentialId, ...inputUpdates } = input;

      const updates: Record<string, any> = {
        updatedAt: new Date(),
      };

      // If updating name, always use encrypted
      if (inputUpdates.encryptedName && inputUpdates.nameNonce) {
        updates.encryptedName = inputUpdates.encryptedName;
        updates.nameNonce = inputUpdates.nameNonce;
      }

      // If updating provider, always use encrypted
      if (inputUpdates.encryptedProvider && inputUpdates.providerNonce) {
        updates.encryptedProvider = inputUpdates.encryptedProvider;
        updates.providerNonce = inputUpdates.providerNonce;
      }

      // If updating API key data
      if (inputUpdates.encryptedData && inputUpdates.iv) {
        updates.encryptedData = inputUpdates.encryptedData;
        updates.iv = inputUpdates.iv;
      }

      const [credential] = await db
        .update(credentials)
        .set(updates)
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
        encryptedName: credential.encryptedName,
        nameNonce: credential.nameNonce,
        encryptedProvider: credential.encryptedProvider,
        providerNonce: credential.providerNonce,
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
