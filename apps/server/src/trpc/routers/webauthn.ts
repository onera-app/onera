/**
 * WebAuthn Router
 * Handles passkey registration and authentication with PRF extension
 *
 * Security Model:
 * - PRF extension provides device-bound secret during authentication
 * - PRF output is used to derive a KEK that encrypts the master key
 * - Each passkey stores its own encrypted copy of the master key
 * - Even with database access, attacker cannot decrypt without passkey + biometrics
 *
 * Flow:
 * 1. Registration: User creates passkey → PRF output → encrypt master key → store
 * 2. Authentication: User signs with passkey → PRF output → decrypt master key → unlock
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db, webauthnCredentials } from "../../db/client";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { randomBytes } from "crypto";

// Environment variables for WebAuthn configuration
const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const rpName = process.env.WEBAUTHN_RP_NAME || "Onera";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

// Store challenges in memory (in production, use Redis or similar)
// Key: challenge, Value: { userId, type, createdAt }
const challengeStore = new Map<
  string,
  { userId: string; type: "registration" | "authentication"; createdAt: Date }
>();

// Clean up expired challenges (older than 5 minutes)
function cleanupExpiredChallenges() {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  for (const [challenge, data] of challengeStore.entries()) {
    if (now - data.createdAt.getTime() > maxAge) {
      challengeStore.delete(challenge);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupExpiredChallenges, 60 * 1000); // Every minute

/**
 * Generate a random PRF salt for new passkey registration
 */
function generatePRFSalt(): string {
  return randomBytes(32).toString("base64");
}

export const webauthnRouter = router({
  /**
   * Check if user has any passkeys registered
   */
  hasPasskeys: protectedProcedure.query(async ({ ctx }) => {
    const [credential] = await db
      .select({ id: webauthnCredentials.id })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, ctx.user.id))
      .limit(1);

    return { hasPasskeys: !!credential };
  }),

  /**
   * List all passkeys for the authenticated user
   * Note: Does not return encrypted master key data
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await db
      .select({
        id: webauthnCredentials.id,
        credentialId: webauthnCredentials.credentialId,
        name: webauthnCredentials.name,
        credentialDeviceType: webauthnCredentials.credentialDeviceType,
        credentialBackedUp: webauthnCredentials.credentialBackedUp,
        lastUsedAt: webauthnCredentials.lastUsedAt,
        createdAt: webauthnCredentials.createdAt,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, ctx.user.id))
      .orderBy(webauthnCredentials.createdAt);

    return credentials.map((cred) => ({
      ...cred,
      // Add human-readable device type
      deviceType:
        cred.credentialDeviceType === "multiDevice"
          ? "Cross-device (synced)"
          : "Single device",
    }));
  }),

  /**
   * Generate registration options for creating a new passkey
   * Returns WebAuthn options and a PRF salt for key derivation
   */
  generateRegistrationOptions: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(), // User-friendly name for the passkey
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get existing credentials to exclude from registration
      const existingCredentials = await db
        .select({
          credentialId: webauthnCredentials.credentialId,
          transports: webauthnCredentials.transports,
        })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, ctx.user.id));

      // Generate PRF salt for this registration
      const prfSalt = generatePRFSalt();

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(ctx.user.id),
        userName: ctx.user.email || ctx.user.id,
        userDisplayName:
          ctx.user.firstName && ctx.user.lastName
            ? `${ctx.user.firstName} ${ctx.user.lastName}`
            : ctx.user.email || ctx.user.id,
        // Don't prompt for additional authenticators if user already has one
        excludeCredentials: existingCredentials.map((cred) => ({
          id: cred.credentialId,
          transports: cred.transports as AuthenticatorTransportFuture[],
        })),
        authenticatorSelection: {
          // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
          authenticatorAttachment: "platform",
          // Require user verification (biometric/PIN)
          userVerification: "required",
          // Prefer resident keys for better UX
          residentKey: "preferred",
        },
        attestationType: "none", // We don't need attestation
        extensions: {
          // Enable PRF extension for key derivation
          // The actual PRF input will be set by the client
        },
      });

      // Store challenge for verification
      challengeStore.set(options.challenge, {
        userId: ctx.user.id,
        type: "registration",
        createdAt: new Date(),
      });

      return {
        options,
        prfSalt, // Client will use this for PRF input
        name: input.name,
      };
    }),

  /**
   * Verify passkey registration and store credentials
   * Client must provide the encrypted master key (encrypted with PRF-derived KEK)
   */
  verifyRegistration: protectedProcedure
    .input(
      z.object({
        response: z.any(), // RegistrationResponseJSON
        prfSalt: z.string(),
        encryptedMasterKey: z.string(),
        masterKeyNonce: z.string(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const response = input.response as RegistrationResponseJSON;

      // Find the challenge from stored challenges
      let expectedChallenge: string | undefined;
      for (const [challenge, data] of challengeStore.entries()) {
        if (data.userId === ctx.user.id && data.type === "registration") {
          expectedChallenge = challenge;
          break;
        }
      }

      if (!expectedChallenge) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending registration challenge found",
        });
      }

      try {
        const verification = await verifyRegistrationResponse({
          response,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });

        if (!verification.verified || !verification.registrationInfo) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Registration verification failed",
          });
        }

        const { registrationInfo } = verification;

        // Check if PRF extension was supported
        // PRF extension types are not in standard WebAuthn types yet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientExtResults = response.clientExtensionResults as any;
        const prfEnabled = clientExtResults?.prf?.enabled;
        if (!prfEnabled) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "PRF extension not supported by this authenticator. Please use a different passkey.",
          });
        }

        // Store the credential
        await db.insert(webauthnCredentials).values({
          userId: ctx.user.id,
          credentialId: registrationInfo.credential.id,
          credentialPublicKey: Buffer.from(
            registrationInfo.credential.publicKey
          ).toString("base64"),
          counter: registrationInfo.credential.counter,
          credentialDeviceType: registrationInfo.credentialDeviceType,
          credentialBackedUp: registrationInfo.credentialBackedUp,
          transports: registrationInfo.credential.transports || [],
          encryptedMasterKey: input.encryptedMasterKey,
          masterKeyNonce: input.masterKeyNonce,
          prfSalt: input.prfSalt,
          name:
            input.name ||
            (registrationInfo.credentialDeviceType === "multiDevice"
              ? "Synced Passkey"
              : "Device Passkey"),
        });

        // Clean up the used challenge
        challengeStore.delete(expectedChallenge);

        return { success: true, verified: true };
      } catch (error) {
        // Clean up on failure
        if (expectedChallenge) {
          challengeStore.delete(expectedChallenge);
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Registration verification error:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Registration verification failed",
        });
      }
    }),

  /**
   * Generate authentication options for signing in with a passkey
   * Returns options and the PRF salt needed for key derivation
   */
  generateAuthenticationOptions: protectedProcedure.mutation(async ({ ctx }) => {
    // Get user's credentials
    const credentials = await db
      .select({
        credentialId: webauthnCredentials.credentialId,
        transports: webauthnCredentials.transports,
        prfSalt: webauthnCredentials.prfSalt,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, ctx.user.id));

    if (credentials.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No passkeys found for this user",
      });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports as AuthenticatorTransportFuture[],
      })),
      userVerification: "required",
    });

    // Store challenge for verification
    challengeStore.set(options.challenge, {
      userId: ctx.user.id,
      type: "authentication",
      createdAt: new Date(),
    });

    // Return options with PRF salts mapped by credential ID
    const prfSalts: Record<string, string> = {};
    for (const cred of credentials) {
      prfSalts[cred.credentialId] = cred.prfSalt;
    }

    return {
      options,
      prfSalts, // Client will use the appropriate salt based on which passkey is used
    };
  }),

  /**
   * Verify passkey authentication and return encrypted master key
   * Client will use PRF output to decrypt the master key
   */
  verifyAuthentication: protectedProcedure
    .input(
      z.object({
        response: z.any(), // AuthenticationResponseJSON
      })
    )
    .mutation(async ({ ctx, input }) => {
      const response = input.response as AuthenticationResponseJSON;

      // Find the expected challenge
      let expectedChallenge: string | undefined;
      for (const [challenge, data] of challengeStore.entries()) {
        if (data.userId === ctx.user.id && data.type === "authentication") {
          expectedChallenge = challenge;
          break;
        }
      }

      if (!expectedChallenge) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No pending authentication challenge found",
        });
      }

      // Get the credential from DB
      const [credential] = await db
        .select()
        .from(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.userId, ctx.user.id),
            eq(webauthnCredentials.credentialId, response.id)
          )
        )
        .limit(1);

      if (!credential) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credential not found",
        });
      }

      try {
        const verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: credential.credentialId,
            publicKey: Buffer.from(credential.credentialPublicKey, "base64"),
            counter: credential.counter,
            transports:
              credential.transports as AuthenticatorTransportFuture[],
          },
        });

        if (!verification.verified) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Authentication verification failed",
          });
        }

        // Update counter and last used timestamp
        await db
          .update(webauthnCredentials)
          .set({
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          })
          .where(eq(webauthnCredentials.id, credential.id));

        // Clean up the used challenge
        challengeStore.delete(expectedChallenge);

        // Return the encrypted master key data for client-side decryption
        return {
          success: true,
          verified: true,
          encryptedMasterKey: credential.encryptedMasterKey,
          masterKeyNonce: credential.masterKeyNonce,
          prfSalt: credential.prfSalt,
        };
      } catch (error) {
        // Clean up on failure
        if (expectedChallenge) {
          challengeStore.delete(expectedChallenge);
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Authentication verification error:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Authentication verification failed",
        });
      }
    }),

  /**
   * Update passkey name
   */
  rename: protectedProcedure
    .input(
      z.object({
        credentialId: z.string(),
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(webauthnCredentials)
        .set({ name: input.name })
        .where(
          and(
            eq(webauthnCredentials.userId, ctx.user.id),
            eq(webauthnCredentials.credentialId, input.credentialId)
          )
        );

      return { success: true };
    }),

  /**
   * Delete a passkey
   */
  delete: protectedProcedure
    .input(
      z.object({
        credentialId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Allow deletion (user can always use recovery phrase as fallback)
      await db
        .delete(webauthnCredentials)
        .where(
          and(
            eq(webauthnCredentials.userId, ctx.user.id),
            eq(webauthnCredentials.credentialId, input.credentialId)
          )
        );

      return { success: true };
    }),
});
