import { and, isNull, lt, eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/client';

const { enclaves, enclaveAssignments } = schema;

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

export function startStaleAssignmentCleanup() {
  setInterval(async () => {
    try {
      const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS);

      // Find and release stale assignments
      const staleAssignments = await db
        .select()
        .from(enclaveAssignments)
        .where(
          and(
            isNull(enclaveAssignments.releasedAt),
            lt(enclaveAssignments.lastActivityAt, staleThreshold)
          )
        );

      for (const assignment of staleAssignments) {
        await db
          .update(enclaveAssignments)
          .set({ releasedAt: new Date() })
          .where(eq(enclaveAssignments.id, assignment.id));

        // Decrement connection count for shared enclaves
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
          const [remaining] = await db
            .select()
            .from(enclaveAssignments)
            .where(
              and(
                eq(enclaveAssignments.enclaveId, enclave.id),
                isNull(enclaveAssignments.releasedAt)
              )
            )
            .limit(1);

          if (!remaining) {
            await db
              .update(enclaves)
              .set({ dedicatedToUserId: null, updatedAt: new Date() })
              .where(eq(enclaves.id, enclave.id));
          }
        }

        console.log(`[Cleanup] Released stale assignment ${assignment.id}`);
      }

      if (staleAssignments.length > 0) {
        console.log(`[Cleanup] Released ${staleAssignments.length} stale assignments`);
      }
    } catch (error) {
      console.error('[Cleanup] Error cleaning stale assignments:', error);
    }
  }, CLEANUP_INTERVAL_MS);
}
