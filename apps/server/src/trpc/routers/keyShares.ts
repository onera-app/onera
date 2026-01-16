/**
 * Key Shares Router
 * Handles CRUD operations for the 3-share E2EE key system
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db, keyShares, devices } from "../../db/client";

export const keySharesRouter = router({
  /**
   * Check if user has key shares set up
   */
  check: protectedProcedure.query(async ({ ctx }) => {
    const [shares] = await db
      .select({ id: keyShares.id })
      .from(keyShares)
      .where(eq(keyShares.userId, ctx.user.id))
      .limit(1);

    return { hasShares: !!shares };
  }),

  /**
   * Get key shares for the authenticated user
   * Used during login to reconstruct the master key
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const [shares] = await db
      .select()
      .from(keyShares)
      .where(eq(keyShares.userId, ctx.user.id))
      .limit(1);

    if (!shares) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Key shares not found. Please complete E2EE setup.",
      });
    }

    return {
      encryptedAuthShare: shares.encryptedAuthShare,
      authShareNonce: shares.authShareNonce,
      encryptedRecoveryShare: shares.encryptedRecoveryShare,
      recoveryShareNonce: shares.recoveryShareNonce,
      publicKey: shares.publicKey,
      encryptedPrivateKey: shares.encryptedPrivateKey,
      privateKeyNonce: shares.privateKeyNonce,
      masterKeyRecovery: shares.masterKeyRecovery,
      masterKeyRecoveryNonce: shares.masterKeyRecoveryNonce,
      encryptedRecoveryKey: shares.encryptedRecoveryKey,
      recoveryKeyNonce: shares.recoveryKeyNonce,
      encryptedMasterKeyForLogin: shares.encryptedMasterKeyForLogin,
      masterKeyForLoginNonce: shares.masterKeyForLoginNonce,
      shareVersion: shares.shareVersion,
    };
  }),

  /**
   * Create key shares for a new user
   * Called during initial E2EE setup after signup
   */
  create: protectedProcedure
    .input(
      z.object({
        encryptedAuthShare: z.string(),
        authShareNonce: z.string(),
        encryptedRecoveryShare: z.string(),
        recoveryShareNonce: z.string(),
        publicKey: z.string(),
        encryptedPrivateKey: z.string(),
        privateKeyNonce: z.string(),
        masterKeyRecovery: z.string(),
        masterKeyRecoveryNonce: z.string(),
        encryptedRecoveryKey: z.string(),
        recoveryKeyNonce: z.string(),
        encryptedMasterKeyForLogin: z.string(),
        masterKeyForLoginNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if shares already exist
      const [existing] = await db
        .select({ id: keyShares.id })
        .from(keyShares)
        .where(eq(keyShares.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Key shares already exist for this user",
        });
      }

      await db.insert(keyShares).values({
        userId: ctx.user.id,
        ...input,
      });

      return { success: true };
    }),

  /**
   * Update auth share (for share rotation)
   */
  updateAuthShare: protectedProcedure
    .input(
      z.object({
        encryptedAuthShare: z.string(),
        authShareNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(keyShares)
        .set({
          encryptedAuthShare: input.encryptedAuthShare,
          authShareNonce: input.authShareNonce,
          updatedAt: new Date(),
        })
        .where(eq(keyShares.userId, ctx.user.id));

      return { success: true };
    }),

  /**
   * Update recovery share (after re-sharding for new device)
   */
  updateRecoveryShare: protectedProcedure
    .input(
      z.object({
        encryptedRecoveryShare: z.string(),
        recoveryShareNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(keyShares)
        .set({
          encryptedRecoveryShare: input.encryptedRecoveryShare,
          recoveryShareNonce: input.recoveryShareNonce,
          updatedAt: new Date(),
        })
        .where(eq(keyShares.userId, ctx.user.id));

      return { success: true };
    }),

  /**
   * Delete all key shares (account deletion)
   */
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(keyShares).where(eq(keyShares.userId, ctx.user.id));
    return { success: true };
  }),
});

/**
 * Devices Router
 * Handles device registration and management
 */
export const devicesRouter = router({
  /**
   * List all devices for the authenticated user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userDevices = await db
      .select()
      .from(devices)
      .where(eq(devices.userId, ctx.user.id))
      .orderBy(devices.lastSeenAt);

    return userDevices;
  }),

  /**
   * Register a new device
   */
  register: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        deviceName: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert device (update if exists, insert if not)
      const [existing] = await db
        .select({ id: devices.id })
        .from(devices)
        .where(eq(devices.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        // Update existing device
        await db
          .update(devices)
          .set({
            deviceName: input.deviceName,
            userAgent: input.userAgent,
            lastSeenAt: new Date(),
          })
          .where(eq(devices.id, existing.id));
      } else {
        // Insert new device
        await db.insert(devices).values({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          deviceName: input.deviceName,
          userAgent: input.userAgent,
        });
      }

      return { success: true };
    }),

  /**
   * Update device last seen timestamp
   */
  updateLastSeen: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(devices)
        .set({ lastSeenAt: new Date() })
        .where(
          and(
            eq(devices.userId, ctx.user.id),
            eq(devices.deviceId, input.deviceId)
          )
        );

      return { success: true };
    }),

  /**
   * Revoke a device (mark as untrusted)
   */
  revoke: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(devices)
        .set({ trusted: false })
        .where(
          and(
            eq(devices.userId, ctx.user.id),
            eq(devices.deviceId, input.deviceId)
          )
        );

      return { success: true };
    }),

  /**
   * Delete a device
   */
  delete: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(devices)
        .where(
          and(
            eq(devices.userId, ctx.user.id),
            eq(devices.deviceId, input.deviceId)
          )
        );

      return { success: true };
    }),
});
