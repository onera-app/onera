import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';
import { router, protectedProcedure, entitledProcedure } from '../trpc';
import { db, schema } from '../../db/client';
import { randomUUID } from 'crypto';

const { enclaves, enclaveAssignments, serverModels, modelServers } = schema;

// Response type from enclave /models endpoint (used for fallback)
interface EnclaveModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  contextLength: number;
}

// Response type from enclave /attestation endpoint
interface AttestationResponse {
  public_key: string; // Base64-encoded
  attestation_type?: string;
}

// Cache for enclave public keys (enclaveId -> hex key)
const publicKeyCache = new Map<string, { key: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch public key from enclave's attestation endpoint.
 * Caches the result for 5 minutes.
 */
async function fetchEnclavePublicKey(enclaveId: string, attestationEndpoint: string): Promise<string> {
  // Check cache
  const cached = publicKeyCache.get(enclaveId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.key;
  }

  try {
    const response = await fetch(attestationEndpoint, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Attestation endpoint returned ${response.status}`);
    }

    const attestation = (await response.json()) as AttestationResponse;

    // Decode base64 to hex
    const keyBytes = Buffer.from(attestation.public_key, 'base64');
    if (keyBytes.length !== 32) {
      throw new Error(`Invalid public key length: ${keyBytes.length}`);
    }
    const hexKey = keyBytes.toString('hex');

    // Cache it
    publicKeyCache.set(enclaveId, { key: hexKey, fetchedAt: Date.now() });

    return hexKey;
  } catch (error) {
    console.error(`Failed to fetch public key from ${attestationEndpoint}:`, error);
    throw error;
  }
}

export const enclavesRouter = router({
  /**
   * List available private inference models.
   * Queries enclaves directly for their available models.
   */
  listModels: entitledProcedure.query(async ({ ctx: _ctx }) => {
    // First try: get models from server_models table (preferred, avoids network calls)
    const dbModels = await db
      .select({
        id: serverModels.modelId,
        name: serverModels.modelName,
        displayName: serverModels.displayName,
        contextLength: serverModels.contextLength,
      })
      .from(serverModels)
      .innerJoin(
        modelServers,
        and(
          eq(serverModels.serverId, modelServers.id),
          eq(modelServers.status, 'ready')
        )
      );

    if (dbModels.length > 0) {
      return dbModels.map((m) => ({
        ...m,
        provider: 'onera-private' as const,
      }));
    }

    // Fallback: query enclaves directly (existing behavior)
    const readyEnclaves = await db
      .select()
      .from(enclaves)
      .where(eq(enclaves.status, 'ready'));

    if (readyEnclaves.length === 0) {
      return [];
    }

    const allModels: Array<{
      id: string;
      name: string;
      displayName: string;
      contextLength: number;
      provider: 'onera-private';
    }> = [];

    for (const enclave of readyEnclaves) {
      try {
        const baseUrl = enclave.attestationEndpoint.replace('/attestation', '');
        const modelsUrl = `${baseUrl}/models`;

        const response = await fetch(modelsUrl, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const models = (await response.json()) as EnclaveModelInfo[];
          for (const m of models) {
            allModels.push({
              id: m.id,
              name: m.name,
              displayName: m.displayName,
              contextLength: m.contextLength,
              provider: 'onera-private',
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch models from enclave ${enclave.id}:`, error);
      }
    }

    return allModels;
  }),

  /**
   * Request an enclave for inference.
   * Now that models come directly from enclaves, we just need to find
   * a ready enclave with available capacity.
   */
  requestEnclave: entitledProcedure
    .input(
      z.object({
        modelId: z.string(),
        tier: z.enum(['shared', 'dedicated']).default('shared'),
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { tier, sessionId } = input;

      // Check feature entitlement for dedicated enclaves
      if (tier === 'dedicated' && !ctx.entitlements.features.dedicatedEnclaves) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Private model access requires a Pro plan or higher. Please upgrade.',
        });
      }

      // Check maxEnclaves limit for dedicated tier
      if (tier === 'dedicated' && ctx.entitlements.maxEnclaves !== -1) {
        const activeAssignments = await db
          .select({ count: sql<number>`count(*)` })
          .from(enclaveAssignments)
          .where(
            and(
              eq(enclaveAssignments.userId, userId),
              isNull(enclaveAssignments.releasedAt)
            )
          );
        const currentCount = Number(activeAssignments[0]?.count) || 0;
        if (currentCount >= ctx.entitlements.maxEnclaves) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `You've reached your limit of ${ctx.entitlements.maxEnclaves} dedicated enclaves.`,
          });
        }
      }

      let enclave;
      const assignmentId = randomUUID();

      if (tier === 'shared') {
        // Use transaction to ensure atomicity of connection increment and assignment creation
        const result = await db.transaction(async (tx) => {
          // Find any ready shared enclave with capacity
          const [updatedEnclave] = await tx
            .update(enclaves)
            .set({
              currentConnections: sql`${enclaves.currentConnections} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(enclaves.tier, 'shared'),
                eq(enclaves.status, 'ready'),
                lt(enclaves.currentConnections, enclaves.maxConnections)
              )
            )
            .returning();

          if (!updatedEnclave) {
            throw new TRPCError({
              code: 'SERVICE_UNAVAILABLE',
              message: 'No available enclaves. Please try again later.',
            });
          }

          // Create assignment record within the same transaction
          await tx.insert(enclaveAssignments).values({
            id: assignmentId,
            enclaveId: updatedEnclave.id,
            userId,
            sessionId,
          });

          return updatedEnclave;
        });

        enclave = result;
      } else {
        // Dedicated tier - check if user already has one
        [enclave] = await db
          .select()
          .from(enclaves)
          .where(
            and(
              eq(enclaves.tier, 'dedicated'),
              eq(enclaves.dedicatedToUserId, userId),
              eq(enclaves.status, 'ready')
            )
          )
          .limit(1);

        if (!enclave) {
          // Try to claim an unassigned dedicated enclave from the pool
          const result = await db.transaction(async (tx) => {
            const [available] = await tx
              .update(enclaves)
              .set({
                dedicatedToUserId: userId,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(enclaves.tier, 'dedicated'),
                  eq(enclaves.status, 'ready'),
                  isNull(enclaves.dedicatedToUserId)
                )
              )
              .returning();

            if (!available) {
              throw new TRPCError({
                code: 'SERVICE_UNAVAILABLE',
                message: 'No dedicated enclaves available. Please try again later.',
              });
            }

            await tx.insert(enclaveAssignments).values({
              id: assignmentId,
              enclaveId: available.id,
              userId,
              sessionId,
            });

            return available;
          });
          enclave = result;
        } else {
          // User already has a dedicated enclave, create assignment
          await db.insert(enclaveAssignments).values({
            id: assignmentId,
            enclaveId: enclave.id,
            userId,
            sessionId,
          });
        }
      }

      // Allow unverified attestation only in development
      // In production, this should always be false to enforce signature verification
      const allowUnverified = process.env.NODE_ENV !== 'production' &&
        process.env.ALLOW_UNVERIFIED_ATTESTATION === 'true';

      // Fetch public key dynamically from enclave's attestation endpoint
      let publicKey: string;
      try {
        publicKey = await fetchEnclavePublicKey(enclave.id, enclave.attestationEndpoint);
      } catch (error) {
        console.error(`Failed to fetch public key for ${enclave.id}:`, error);
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Unable to retrieve enclave public key',
        });
      }

      return {
        enclaveId: enclave.id,
        endpoint: {
          id: enclave.id,
          host: enclave.host,
          port: enclave.port,
          public_key: publicKey,
        },
        wsEndpoint: enclave.wsEndpoint,
        attestationEndpoint: enclave.attestationEndpoint,
        // No expected measurements since models come from enclave directly
        // Attestation verification still happens but without pre-known digests
        expectedMeasurements: undefined as { launch_digest: string } | undefined,
        // Allow unverified only in dev mode with explicit env var
        allowUnverified,
        assignmentId,
      };
    }),

  /**
   * Release an enclave assignment.
   */
  releaseEnclave: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [assignment] = await db
        .select()
        .from(enclaveAssignments)
        .where(
          and(
            eq(enclaveAssignments.id, input.assignmentId),
            eq(enclaveAssignments.userId, userId),
            isNull(enclaveAssignments.releasedAt)
          )
        )
        .limit(1);

      if (!assignment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Assignment not found or already released',
        });
      }

      await db
        .update(enclaveAssignments)
        .set({ releasedAt: new Date() })
        .where(eq(enclaveAssignments.id, assignment.id));

      const [enclave] = await db
        .select()
        .from(enclaves)
        .where(eq(enclaves.id, assignment.enclaveId))
        .limit(1);

      if (enclave?.tier === 'shared') {
        await db
          .update(enclaves)
          .set({
            currentConnections: sql`GREATEST(${enclaves.currentConnections} - 1, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(enclaves.id, enclave.id));
      }

      if (enclave?.tier === 'dedicated') {
        // Check if this was the last active assignment
        const [activeAssignment] = await db
          .select()
          .from(enclaveAssignments)
          .where(
            and(
              eq(enclaveAssignments.enclaveId, enclave.id),
              isNull(enclaveAssignments.releasedAt)
            )
          )
          .limit(1);

        if (!activeAssignment) {
          // No more active sessions, release the dedicated enclave back to pool
          await db
            .update(enclaves)
            .set({
              dedicatedToUserId: null,
              updatedAt: new Date(),
            })
            .where(eq(enclaves.id, enclave.id));
        }
      }

      return { success: true };
    }),

  /**
   * Heartbeat to keep assignment alive.
   */
  heartbeat: protectedProcedure
    .input(z.object({ assignmentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(enclaveAssignments)
        .set({ lastActivityAt: new Date() })
        .where(
          and(
            eq(enclaveAssignments.id, input.assignmentId),
            eq(enclaveAssignments.userId, ctx.user.id),
            isNull(enclaveAssignments.releasedAt)
          )
        );
      return { success: true };
    }),
});
