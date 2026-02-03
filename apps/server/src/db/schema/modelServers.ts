import { pgTable, text, timestamp, integer, unique } from 'drizzle-orm/pg-core';

/**
 * Model servers - physical or virtual machines running LLM inference
 * Each server has an enclave sidecar for E2E encryption
 */
export const modelServers = pgTable('model_servers', {
  id: text('id').primaryKey(),

  // Connection info
  host: text('host').notNull(),
  wsEndpoint: text('ws_endpoint').notNull(),
  attestationEndpoint: text('attestation_endpoint').notNull(),

  // Attestation data (cached from server's enclave)
  launchDigest: text('launch_digest'),
  lastAttestationAt: timestamp('last_attestation_at'),

  // Server capabilities
  serverType: text('server_type').notNull().$type<'gpu' | 'cpu'>(),
  gpuModel: text('gpu_model'), // e.g., 'A100-80GB', 'A10-24GB'
  cpuCores: integer('cpu_cores'),
  memoryGb: integer('memory_gb'),

  // Status
  status: text('status').notNull().$type<'provisioning' | 'ready' | 'offline' | 'draining'>(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastHealthCheckAt: timestamp('last_health_check_at'),
});

/**
 * Models available on each server
 * A model can exist on multiple servers (for redundancy/load balancing)
 */
export const serverModels = pgTable('server_models', {
  id: text('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => modelServers.id, { onDelete: 'cascade' }),

  // Model identification
  modelId: text('model_id').notNull(),      // Raw model ID from LLM server
  modelName: text('model_name').notNull(),   // Short name
  displayName: text('display_name').notNull(), // Human-readable name

  // Model capabilities
  contextLength: integer('context_length').default(8192),
  maxTokens: integer('max_tokens'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('server_model_unique').on(table.serverId, table.modelId),
]);

// Type exports
export type ModelServer = typeof modelServers.$inferSelect;
export type NewModelServer = typeof modelServers.$inferInsert;
export type ServerModel = typeof serverModels.$inferSelect;
export type NewServerModel = typeof serverModels.$inferInsert;
