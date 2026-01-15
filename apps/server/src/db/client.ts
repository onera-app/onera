import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema-pg";

// DATABASE_URL format: postgresql://user:pass@host:5432/db
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// PostgreSQL connection
const pool = new pg.Pool({
  connectionString: dbUrl,
  max: 10, // Connection pool size
});

export const db = drizzle(pool, { schema });

// Export for backwards compatibility
export const isPostgres = true;

// Export the schema for use in auth and other places
export { schema };

// Re-export individual tables for convenient imports in routers
export const {
  users,
  sessions,
  accounts,
  verifications,
  userKeys,
  folders,
  chats,
  notes,
  credentials,
  prompts,
} = schema;

// Type for the database
export type DrizzleDatabase = typeof db;
