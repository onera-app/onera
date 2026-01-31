import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { db, schema } from '../../db/client';
import { randomUUID } from 'crypto';

const { enclaves, enclaveAssignments } = schema;

// Response type from enclave /models endpoint
interface EnclaveModelInfo {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  contextLength: number;
}

export const enclavesRouter = router({
  /**
   * List available private inference models by querying enclaves directly.
   */
  listModels: protectedProcedure.query(async () => {
    // Get all ready enclaves
    const readyEnclaves = await db
      .select()
      .from(enclaves)
      .where(eq(enclaves.status, 'ready'));

    if (readyEnclaves.length === 0) {
      return [];
    }

    // Fetch models from each enclave
    const allModels: Array<{
      id: string;
      name: string;
      displayName: string;
      contextLength: number;
      provider: 'onera-private';
    }> = [];

    for (const enclave of readyEnclaves) {
      try {
        // Derive models URL from attestation endpoint
        const baseUrl = enclave.attestationEndpoint.replace('/attestation', '');
        const modelsUrl = `${baseUrl}/models`;

        const response = await fetch(modelsUrl, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
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
        // Log but don't fail - enclave might be temporarily unavailable
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
  requestEnclave: protectedProcedure
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
      // modelId is passed but we don't validate it against DB anymore
      // since models come directly from enclaves

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
          throw new TRPCError({
            code: 'NOT_IMPLEMENTED',
            message: 'Dedicated enclave provisioning not yet implemented',
          });
        }

        // Create assignment record for dedicated tier
        await db.insert(enclaveAssignments).values({
          id: assignmentId,
          enclaveId: enclave.id,
          userId,
          sessionId,
        });
      }

      // Allow unverified attestation only in development
      // In production, this should always be false to enforce signature verification
      const allowUnverified = process.env.NODE_ENV !== 'production' &&
        process.env.ALLOW_UNVERIFIED_ATTESTATION === 'true';

      return {
        enclaveId: enclave.id,
        endpoint: {
          id: enclave.id,
          host: enclave.host,
          port: enclave.port,
          public_key: enclave.publicKey || '',
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
