/**
 * Key Shares Router
 * Handles CRUD operations for the 3-share E2EE key system (Privy-style server-protected)
 *
 * Security Model:
 * - Auth share is stored as PLAINTEXT on the server
 * - Security comes from Supabase authentication, NOT encryption
 * - The auth share is ONLY released to authenticated Supabase sessions via protectedProcedure
 * - Even with full database access, an attacker cannot decrypt user data without:
 *   1. A valid Supabase session (to get auth share)
 *   2. Device access (to get device share from localStorage)
 *   3. Recovery phrase (optional, for recovery share)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db, keyShares, devices, webauthnCredentials } from "../../db/client";
import { randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random secret for device binding
 */
function generateDeviceSecret(): string {
  return randomBytes(32).toString("base64");
}

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
   * Get comprehensive onboarding status derived from database state
   * 
   * This allows the frontend to resume onboarding from the correct step
   * if a user leaves mid-flow. The status is derived from:
   * - keyShares existence (encryption set up)
   * - webauthnCredentials existence (passkey set up)
   * - encryptedMasterKeyWithPassword existence (password set up)
   * 
   * Onboarding is considered complete when:
   * - User has keyShares AND
   * - User has at least one unlock method (passkey OR password)
   */
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    // Check key shares and password encryption in one query
    const [shares] = await db
      .select({
        id: keyShares.id,
        hasPassword: keyShares.encryptedMasterKeyWithPassword,
      })
      .from(keyShares)
      .where(eq(keyShares.userId, ctx.user.id))
      .limit(1);

    const hasKeyShares = !!shares;
    const hasPassword = !!shares?.hasPassword;

    // Check if user has any passkeys
    let hasPasskey = false;
    if (hasKeyShares) {
      const [credential] = await db
        .select({ id: webauthnCredentials.id })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, ctx.user.id))
        .limit(1);
      hasPasskey = !!credential;
    }

    const hasUnlockMethod = hasPasskey || hasPassword;
    const onboardingComplete = hasKeyShares && hasUnlockMethod;

    return {
      hasKeyShares,
      hasPasskey,
      hasPassword,
      hasUnlockMethod,
      onboardingComplete,
    };
  }),

  /**
   * Get key shares for the authenticated user
   * Used during login to reconstruct the master key
   *
   * SECURITY: This endpoint is protected by Supabase authentication.
   * The auth share is only released to authenticated users.
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

    // Return plaintext auth share - security is provided by Supabase authentication
    return {
      authShare: shares.authShare,
      encryptedRecoveryShare: shares.encryptedRecoveryShare,
      recoveryShareNonce: shares.recoveryShareNonce,
      publicKey: shares.publicKey,
      encryptedPrivateKey: shares.encryptedPrivateKey,
      privateKeyNonce: shares.privateKeyNonce,
      masterKeyRecovery: shares.masterKeyRecovery,
      masterKeyRecoveryNonce: shares.masterKeyRecoveryNonce,
      encryptedRecoveryKey: shares.encryptedRecoveryKey,
      recoveryKeyNonce: shares.recoveryKeyNonce,
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
        authShare: z.string(), // Plaintext auth share (base64)
        encryptedRecoveryShare: z.string(),
        recoveryShareNonce: z.string(),
        publicKey: z.string(),
        encryptedPrivateKey: z.string(),
        privateKeyNonce: z.string(),
        masterKeyRecovery: z.string(),
        masterKeyRecoveryNonce: z.string(),
        encryptedRecoveryKey: z.string(),
        recoveryKeyNonce: z.string(),
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
        authShare: z.string(), // Plaintext auth share (base64)
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(keyShares)
        .set({
          authShare: input.authShare,
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

  /**
   * Reset encryption completely - for users who lost their recovery phrase
   * 
   * WARNING: This is destructive! All encrypted data will become inaccessible.
   * Use only when user cannot unlock and has no other option.
   * 
   * This deletes:
   * - Key shares
   * - All devices
   * - All WebAuthn credentials
   * 
   * After reset, user will go through onboarding again.
   */
  resetEncryption: protectedProcedure
    .input(
      z.object({
        confirmPhrase: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Require explicit confirmation
      if (input.confirmPhrase !== 'RESET MY ENCRYPTION') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Please type "RESET MY ENCRYPTION" to confirm',
        });
      }

      // Delete in order: webauthn credentials, devices, key shares
      await db.delete(webauthnCredentials).where(eq(webauthnCredentials.userId, ctx.user.id));
      await db.delete(devices).where(eq(devices.userId, ctx.user.id));
      await db.delete(keyShares).where(eq(keyShares.userId, ctx.user.id));

      return { success: true };
    }),

  /**
   * Check if user has password-based encryption set up
   */
  hasPasswordEncryption: protectedProcedure.query(async ({ ctx }) => {
    const [shares] = await db
      .select({ encryptedMasterKeyWithPassword: keyShares.encryptedMasterKeyWithPassword })
      .from(keyShares)
      .where(eq(keyShares.userId, ctx.user.id))
      .limit(1);

    return { hasPassword: !!shares?.encryptedMasterKeyWithPassword };
  }),

  /**
   * Set up password-based encryption for master key
   * This allows unlocking with a password instead of passkey or recovery phrase
   */
  setPasswordEncryption: protectedProcedure
    .input(
      z.object({
        encryptedMasterKey: z.string(),
        nonce: z.string(),
        salt: z.string(),
        opsLimit: z.number(),
        memLimit: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(keyShares)
        .set({
          encryptedMasterKeyWithPassword: input.encryptedMasterKey,
          masterKeyPasswordNonce: input.nonce,
          passwordKekSalt: input.salt,
          passwordKekOpsLimit: input.opsLimit,
          passwordKekMemLimit: input.memLimit,
          updatedAt: new Date(),
        })
        .where(eq(keyShares.userId, ctx.user.id));

      return { success: true };
    }),

  /**
   * Get password-encrypted master key for unlock
   */
  getPasswordEncryption: protectedProcedure.query(async ({ ctx }) => {
    const [shares] = await db
      .select({
        encryptedMasterKeyWithPassword: keyShares.encryptedMasterKeyWithPassword,
        masterKeyPasswordNonce: keyShares.masterKeyPasswordNonce,
        passwordKekSalt: keyShares.passwordKekSalt,
        passwordKekOpsLimit: keyShares.passwordKekOpsLimit,
        passwordKekMemLimit: keyShares.passwordKekMemLimit,
      })
      .from(keyShares)
      .where(eq(keyShares.userId, ctx.user.id))
      .limit(1);

    if (!shares?.encryptedMasterKeyWithPassword) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Password encryption not set up for this user",
      });
    }

    return {
      encryptedMasterKey: shares.encryptedMasterKeyWithPassword,
      nonce: shares.masterKeyPasswordNonce!,
      salt: shares.passwordKekSalt!,
      opsLimit: shares.passwordKekOpsLimit!,
      memLimit: shares.passwordKekMemLimit!,
    };
  }),

  /**
   * Remove password-based encryption
   */
  removePasswordEncryption: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(keyShares)
      .set({
        encryptedMasterKeyWithPassword: null,
        masterKeyPasswordNonce: null,
        passwordKekSalt: null,
        passwordKekOpsLimit: null,
        passwordKekMemLimit: null,
        updatedAt: new Date(),
      })
      .where(eq(keyShares.userId, ctx.user.id));

    return { success: true };
  }),
});

/**
 * Devices Router
 * Handles device registration and management
 *
 * Security: Each device has a server-generated deviceSecret that is combined with
 * the deviceId and browser fingerprint to derive the device share encryption key.
 * This prevents attackers with just localStorage access from decrypting device shares.
 */
export const devicesRouter = router({
  /**
   * List all devices for the authenticated user
   * Note: deviceSecret is intentionally NOT returned in list to minimize exposure
   * Returns encrypted device name fields for client-side decryption
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userDevices = await db
      .select({
        id: devices.id,
        userId: devices.userId,
        deviceId: devices.deviceId,
        encryptedDeviceName: devices.encryptedDeviceName,
        deviceNameNonce: devices.deviceNameNonce,
        userAgent: devices.userAgent,
        trusted: devices.trusted,
        lastSeenAt: devices.lastSeenAt,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .where(eq(devices.userId, ctx.user.id))
      .orderBy(devices.lastSeenAt);

    return userDevices;
  }),

  /**
   * Register a new device and get its deviceSecret
   * The deviceSecret is used as server-side entropy for device share encryption
   *
   * @returns deviceSecret for deriving device share encryption key
   */
  register: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        encryptedDeviceName: z.string().optional(),
        deviceNameNonce: z.string().optional(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if device already exists for this user
      const [existing] = await db
        .select({ id: devices.id, deviceSecret: devices.deviceSecret })
        .from(devices)
        .where(
          and(
            eq(devices.userId, ctx.user.id),
            eq(devices.deviceId, input.deviceId)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing device and return existing secret
        const updateData: Record<string, unknown> = {
          userAgent: input.userAgent,
          lastSeenAt: new Date(),
        };

        if (input.encryptedDeviceName && input.deviceNameNonce) {
          updateData.encryptedDeviceName = input.encryptedDeviceName;
          updateData.deviceNameNonce = input.deviceNameNonce;
        }

        await db
          .update(devices)
          .set(updateData)
          .where(eq(devices.id, existing.id));

        return { success: true, deviceSecret: existing.deviceSecret };
      } else {
        // Generate new device secret and insert new device
        const deviceSecret = generateDeviceSecret();

        await db.insert(devices).values({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          encryptedDeviceName: input.encryptedDeviceName,
          deviceNameNonce: input.deviceNameNonce,
          userAgent: input.userAgent,
          deviceSecret,
        });

        return { success: true, deviceSecret };
      }
    }),

  /**
   * Get device secret for the current device
   * Used when the device share needs to be decrypted
   */
  getDeviceSecret: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [device] = await db
        .select({ deviceSecret: devices.deviceSecret })
        .from(devices)
        .where(
          and(
            eq(devices.userId, ctx.user.id),
            eq(devices.deviceId, input.deviceId)
          )
        )
        .limit(1);

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found. Please register this device first.",
        });
      }

      return { deviceSecret: device.deviceSecret };
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
