import { pgTable, text, timestamp, integer, index, unique } from 'drizzle-orm/pg-core';

export const modelServers = pgTable('model_servers', {
  id: text('id').primaryKey(),
  host: text('host').notNull(),
  wsEndpoint: text('ws_endpoint').notNull(),
  attestationEndpoint: text('attestation_endpoint').notNull(),

  // Hardware info
  serverType: text('server_type').notNull().$type<'gpu' | 'cpu'>(),
  gpuModel: text('gpu_model'),
  cpuCores: integer('cpu_cores'),
  memoryGb: integer('memory_gb'),

  // Status tracking
  status: text('status').notNull().$type<'provisioning' | 'ready' | 'offline' | 'draining'>(),
  launchDigest: text('launch_digest'),
  lastAttestationAt: timestamp('last_attestation_at'),
  lastHealthCheckAt: timestamp('last_health_check_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_model_servers_status').on(table.status),
]);

export const serverModels = pgTable('server_models', {
  id: text('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => modelServers.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  modelName: text('model_name').notNull(),
  displayName: text('display_name').notNull(),
  contextLength: integer('context_length').default(8192),
  maxTokens: integer('max_tokens'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_server_models_server_id').on(table.serverId),
  index('idx_server_models_model_id').on(table.modelId),
  unique('uq_server_model').on(table.serverId, table.modelId),
]);

// Type exports
export type ModelServer = typeof modelServers.$inferSelect;
export type NewModelServer = typeof modelServers.$inferInsert;
export type ServerModel = typeof serverModels.$inferSelect;
export type NewServerModel = typeof serverModels.$inferInsert;
