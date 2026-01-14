import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db, userKeys } from "../../db/client";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const userKeysRouter = router({
  check: protectedProcedure.query(async ({ ctx }) => {
    const [keys] = await db
      .select({ id: userKeys.id })
      .from(userKeys)
      .where(eq(userKeys.userId, ctx.user.id))
      .limit(1);

    return { hasKeys: !!keys };
  }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const [keys] = await db
      .select()
      .from(userKeys)
      .where(eq(userKeys.userId, ctx.user.id))
      .limit(1);

    if (!keys) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User keys not found" });
    }

    return {
      kekSalt: keys.kekSalt,
      kekOpsLimit: keys.kekOpsLimit,
      kekMemLimit: keys.kekMemLimit,
      encryptedMasterKey: keys.encryptedMasterKey,
      masterKeyNonce: keys.masterKeyNonce,
      publicKey: keys.publicKey,
      encryptedPrivateKey: keys.encryptedPrivateKey,
      privateKeyNonce: keys.privateKeyNonce,
      encryptedRecoveryKey: keys.encryptedRecoveryKey,
      recoveryKeyNonce: keys.recoveryKeyNonce,
      masterKeyRecovery: keys.masterKeyRecovery,
      masterKeyRecoveryNonce: keys.masterKeyRecoveryNonce,
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        kekSalt: z.string(),
        kekOpsLimit: z.number(),
        kekMemLimit: z.number(),
        encryptedMasterKey: z.string(),
        masterKeyNonce: z.string(),
        publicKey: z.string(),
        encryptedPrivateKey: z.string(),
        privateKeyNonce: z.string(),
        encryptedRecoveryKey: z.string(),
        recoveryKeyNonce: z.string(),
        masterKeyRecovery: z.string(),
        masterKeyRecoveryNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if keys already exist
      const [existing] = await db
        .select({ id: userKeys.id })
        .from(userKeys)
        .where(eq(userKeys.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User keys already exist",
        });
      }

      await db.insert(userKeys).values({
        userId: ctx.user.id,
        ...input,
      });

      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        kekSalt: z.string().optional(),
        kekOpsLimit: z.number().optional(),
        kekMemLimit: z.number().optional(),
        encryptedMasterKey: z.string().optional(),
        masterKeyNonce: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select({ id: userKeys.id })
        .from(userKeys)
        .where(eq(userKeys.userId, ctx.user.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User keys not found",
        });
      }

      await db
        .update(userKeys)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(userKeys.userId, ctx.user.id));

      return { success: true };
    }),
});
