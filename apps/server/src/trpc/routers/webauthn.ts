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

// =============================================================================
// Zod Schemas for WebAuthn Response Validation
// =============================================================================

/**
 * Schema for authenticator transports
 */
const authenticatorTransportSchema = z.enum([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

/**
 * Schema for RegistrationResponseJSON from @simplewebauthn/types
 * Validates the structure before passing to verifyRegistrationResponse
 * 
 * Note: We use a permissive schema for clientExtensionResults since the
 * WebAuthn spec allows arbitrary extensions and the types from @simplewebauthn
 * don't have an index signature.
 */
const registrationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: z.string().min(1),
    attestationObject: z.string().min(1),
    transports: z.array(authenticatorTransportSchema).optional(),
    publicKeyAlgorithm: z.number().optional(),
    publicKey: z.string().optional(),
    authenticatorData: z.string().optional(),
  }),
  // Use record for clientExtensionResults to allow any extension properties
  clientExtensionResults: z.record(z.unknown()).optional(),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

/**
 * Schema for AuthenticationResponseJSON from @simplewebauthn/types
 * Validates the structure before passing to verifyAuthenticationResponse
 */
const authenticationResponseSchema = z.object({
  id: z.string().min(1),
  rawId: z.string().min(1),
  type: z.literal("public-key"),
  response: z.object({
    clientDataJSON: z.string().min(1),
    authenticatorData: z.string().min(1),
    signature: z.string().min(1),
    userHandle: z.string().optional().nullable(),
  }),
  // Use record for clientExtensionResults to allow any extension properties
  clientExtensionResults: z.record(z.unknown()).optional(),
  authenticatorAttachment: z.enum(["platform", "cross-platform"]).optional(),
});

// =============================================================================
// WebAuthn Configuration
// =============================================================================

const rpID = process.env.WEBAUTHN_RP_ID || "localhost";
const rpName = process.env.WEBAUTHN_RP_NAME || "Onera";
const origin = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";

// =============================================================================
// Challenge Store
// =============================================================================
// 
// TODO [PRODUCTION]: Replace in-memory challenge store with Redis or similar
// distributed cache. The current implementation will not work correctly in:
// - Multi-instance deployments (load-balanced servers)
// - Serverless environments (Lambda, Vercel, etc.)
// - After server restarts (all pending challenges lost)
//
// Recommended implementation:
// 1. Use Redis with TTL (5 minutes)
// 2. Key format: `webauthn:challenge:${challenge}`
// 3. Value: JSON.stringify({ userId, type, createdAt })
//
// Example Redis implementation:
// ```
// import { Redis } from '@upstash/redis' // or ioredis
// const redis = new Redis({ url: process.env.REDIS_URL })
// 
// async function storeChallenge(challenge: string, data: ChallengeData) {
//   await redis.set(`webauthn:challenge:${challenge}`, JSON.stringify(data), { ex: 300 })
// }
// 
// async function getChallenge(challenge: string): Promise<ChallengeData | null> {
//   const data = await redis.get(`webauthn:challenge:${challenge}`)
//   return data ? JSON.parse(data) : null
// }
// ```
//
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

// Run cleanup periodically (only needed for in-memory store)
setInterval(cleanupExpiredChallenges, 60 * 1000); // Every minute

// =============================================================================
// Rate Limiting
// =============================================================================
//
// TODO [PRODUCTION]: Implement rate limiting for WebAuthn endpoints
// 
// While WebAuthn provides inherent protection via biometric/PIN requirements,
// rate limiting helps prevent:
// - Credential enumeration attacks
// - Resource exhaustion from malicious registration attempts
// - Brute force attacks on compromised devices
//
// Recommended limits:
// - generateRegistrationOptions: 5 requests per minute per user
// - verifyRegistration: 3 requests per minute per user
// - generateAuthenticationOptions: 10 requests per minute per user
// - verifyAuthentication: 5 requests per minute per user
//
// Implementation options:
// 1. Use @upstash/ratelimit with Redis
// 2. Use express-rate-limit if using Express
// 3. Implement custom sliding window algorithm with Redis
//
// Example with @upstash/ratelimit:
// ```
// import { Ratelimit } from '@upstash/ratelimit'
// import { Redis } from '@upstash/redis'
// 
// const ratelimit = new Ratelimit({
//   redis: Redis.fromEnv(),
//   limiter: Ratelimit.slidingWindow(5, '1 m'),
//   prefix: 'webauthn-ratelimit',
// })
// 
// // In each procedure:
// const { success, limit, reset, remaining } = await ratelimit.limit(`${ctx.user.id}:registration`)
// if (!success) {
//   throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' })
// }
// ```

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
   * Returns encrypted name fields for client-side decryption
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const credentials = await db
      .select({
        id: webauthnCredentials.id,
        credentialId: webauthnCredentials.credentialId,
        encryptedName: webauthnCredentials.encryptedName,
        nameNonce: webauthnCredentials.nameNonce,
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

      // Clean up any stale registration challenges for this user before creating a new one
      // This handles cases where user cancels and retries
      for (const [challenge, data] of challengeStore.entries()) {
        if (data.userId === ctx.user.id && data.type === "registration") {
          challengeStore.delete(challenge);
        }
      }

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
        response: registrationResponseSchema,
        prfSalt: z.string().min(1),
        encryptedMasterKey: z.string().min(1),
        masterKeyNonce: z.string().min(1),
        // Encrypted name fields
        encryptedName: z.string().optional(),
        nameNonce: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const response = input.response as RegistrationResponseJSON;

      // Extract the challenge from clientDataJSON to match the actual challenge used
      // This handles cases where user cancels and retries (generating a new challenge)
      let expectedChallenge: string | undefined;
      try {
        const clientDataJson = Buffer.from(
          response.response.clientDataJSON,
          "base64"
        ).toString("utf8");
        const clientData = JSON.parse(clientDataJson) as { challenge?: string };
        expectedChallenge = clientData.challenge;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid clientDataJSON",
        });
      }

      // Validate the challenge exists in our store and belongs to this user
      const challengeEntry = expectedChallenge
        ? challengeStore.get(expectedChallenge)
        : undefined;

      if (
        !expectedChallenge ||
        !challengeEntry ||
        challengeEntry.userId !== ctx.user.id ||
        challengeEntry.type !== "registration"
      ) {
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

        // Store the credential with encrypted name
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
          encryptedName: input.encryptedName,
          nameNonce: input.nameNonce,
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
        response: authenticationResponseSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const response = input.response as AuthenticationResponseJSON;

      // Find the expected challenge from clientDataJSON to avoid stale entries
      let expectedChallenge: string | undefined;
      try {
        const clientDataJson = Buffer.from(
          response.response.clientDataJSON,
          "base64url"
        ).toString("utf8");
        const clientData = JSON.parse(clientDataJson) as { challenge?: string };
        expectedChallenge = clientData.challenge;
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid clientDataJSON",
        });
      }

      const challengeEntry = expectedChallenge
        ? challengeStore.get(expectedChallenge)
        : undefined;

      if (
        !expectedChallenge ||
        !challengeEntry ||
        challengeEntry.userId !== ctx.user.id ||
        challengeEntry.type !== "authentication"
      ) {
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

        // Counter anomaly detection
        const oldCounter = credential.counter;
        const newCounter = verification.authenticationInfo.newCounter;
        const counterJump = newCounter - oldCounter;

        // Log suspicious counter behavior that might indicate credential cloning
        // Note: A jump of exactly 1 is normal. Larger jumps can occur legitimately
        // if the credential is used on another site, but very large jumps are suspicious.
        const COUNTER_JUMP_WARNING_THRESHOLD = 100;
        const COUNTER_JUMP_CRITICAL_THRESHOLD = 1000;

        if (counterJump > COUNTER_JUMP_CRITICAL_THRESHOLD) {
          console.error(
            `[SECURITY] Critical counter anomaly detected for user ${ctx.user.id}, ` +
            `credential ${credential.credentialId}: counter jumped from ${oldCounter} to ${newCounter} ` +
            `(+${counterJump}). This may indicate credential cloning or replay attack.`
          );
          // TODO: In production, send alert to security monitoring system
        } else if (counterJump > COUNTER_JUMP_WARNING_THRESHOLD) {
          console.warn(
            `[SECURITY] Counter anomaly warning for user ${ctx.user.id}, ` +
            `credential ${credential.credentialId}: counter jumped from ${oldCounter} to ${newCounter} ` +
            `(+${counterJump}). Monitor for additional suspicious activity.`
          );
        } else if (counterJump <= 0 && oldCounter > 0) {
          // This should not happen - the library should reject it, but log just in case
          console.error(
            `[SECURITY] Counter did not increase for user ${ctx.user.id}, ` +
            `credential ${credential.credentialId}: old=${oldCounter}, new=${newCounter}. ` +
            `This indicates a potential replay attack or credential cloning.`
          );
        }

        // Update counter and last used timestamp
        await db
          .update(webauthnCredentials)
          .set({
            counter: newCounter,
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
   * Accepts encrypted name fields
   */
  rename: protectedProcedure
    .input(
      z.object({
        credentialId: z.string(),
        // Encrypted name fields
        encryptedName: z.string(),
        nameNonce: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(webauthnCredentials)
        .set({
          encryptedName: input.encryptedName,
          nameNonce: input.nameNonce,
        })
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
