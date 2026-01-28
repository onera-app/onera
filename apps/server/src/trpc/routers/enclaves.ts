import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, lt, sql } from 'drizzle-orm';
import { router, protectedProcedure } from '../trpc';
import { db, schema } from '../../db/client';
import { randomUUID } from 'crypto';

const { enclaves, privateInferenceModels, enclaveAssignments } = schema;

export const enclavesRouter = router({
  /**
   * List available private inference models.
   */
  listModels: protectedProcedure.query(async () => {
    const models = await db
      .select()
      .from(privateInferenceModels)
      .where(eq(privateInferenceModels.enabled, true));

    return models.map((m) => ({
      id: m.id,
      name: m.name,
      displayName: m.displayName,
      contextLength: m.contextLength,
      provider: 'onera-private' as const,
    }));
  }),

  /**
   * Request an enclave for inference.
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
      const { modelId, tier, sessionId } = input;

      // Verify model exists and is enabled
      const [model] = await db
        .select()
        .from(privateInferenceModels)
        .where(
          and(
            eq(privateInferenceModels.id, modelId),
            eq(privateInferenceModels.enabled, true)
          )
        )
        .limit(1);

      if (!model) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Model not found',
        });
      }

      let enclave;
      const assignmentId = randomUUID();

      if (tier === 'shared') {
        // Use transaction to ensure atomicity of connection increment and assignment creation
        const result = await db.transaction(async (tx) => {
          // Atomic UPDATE that checks capacity AND increments in one operation
          const [updatedEnclave] = await tx
            .update(enclaves)
            .set({
              currentConnections: sql`${enclaves.currentConnections} + 1`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(enclaves.modelId, modelId),
                eq(enclaves.tier, 'shared'),
                eq(enclaves.status, 'ready'),
                lt(enclaves.currentConnections, enclaves.maxConnections)
              )
            )
            .returning();

          if (!updatedEnclave) {
            throw new TRPCError({
              code: 'SERVICE_UNAVAILABLE',
              message: 'No available enclaves for this model. Please try again later.',
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
              eq(enclaves.modelId, modelId),
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

      return {
        enclaveId: enclave.id,
        endpoint: {
          id: enclave.id,
          host: enclave.host,
          port: enclave.port,
          publicKey: enclave.publicKey || '',
        },
        wsEndpoint: enclave.wsEndpoint,
        attestationEndpoint: enclave.attestationEndpoint,
        expectedMeasurements: model.expectedLaunchDigest
          ? { launchDigest: model.expectedLaunchDigest }
          : undefined,
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
