import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

export const enclaves = pgTable('enclaves', {
  id: text('id').primaryKey(),
  tier: text('tier').notNull().$type<'shared' | 'dedicated'>(),
  status: text('status').notNull().$type<'provisioning' | 'ready' | 'draining' | 'terminated'>(),

  // Router mode: routes to model servers instead of local vLLM
  isRouter: boolean('is_router').default(false).notNull(),

  // Connection info
  host: text('host').notNull(),
  port: integer('port').notNull(),
  wsEndpoint: text('ws_endpoint').notNull(),
  attestationEndpoint: text('attestation_endpoint').notNull(),

  // Attestation data (cached)
  launchDigest: text('launch_digest'),
  lastAttestationAt: timestamp('last_attestation_at'),

  // Capacity tracking (for shared enclaves)
  currentConnections: integer('current_connections').default(0),
  maxConnections: integer('max_connections').default(10),

  // Dedicated enclave ownership
  dedicatedToUserId: text('dedicated_to_user_id'),

  // Azure-specific metadata
  azureVmId: text('azure_vm_id'),
  azureResourceGroup: text('azure_resource_group'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastHealthCheckAt: timestamp('last_health_check_at'),
}, (table) => [
  index('idx_enclaves_status').on(table.status),
  index('idx_enclaves_tier').on(table.tier),
]);

export const enclaveAssignments = pgTable('enclave_assignments', {
  id: text('id').primaryKey(),
  enclaveId: text('enclave_id').notNull().references(() => enclaves.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').notNull(),

  // Assignment tracking
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
}, (table) => [
  index('idx_enclave_assignments_user_id').on(table.userId),
  index('idx_enclave_assignments_enclave_id').on(table.enclaveId),
  index('idx_enclave_assignments_session_id').on(table.sessionId),
]);

// Type exports
export type Enclave = typeof enclaves.$inferSelect;
export type NewEnclave = typeof enclaves.$inferInsert;
export type EnclaveAssignment = typeof enclaveAssignments.$inferSelect;
export type NewEnclaveAssignment = typeof enclaveAssignments.$inferInsert;
