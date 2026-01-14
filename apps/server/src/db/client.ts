import { drizzle as drizzleSqlite, BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Database } from "bun:sqlite";
import pg from "pg";
import * as schemaSqlite from "./schema";
import * as schemaPg from "./schema-pg";
import path from "path";
import fs from "fs";

// DATABASE_URL formats:
// - SQLite: file:./data/onera.db or file:/app/data/onera.db
// - PostgreSQL: postgres://user:pass@host:5432/db or postgresql://...
const dbUrl = process.env.DATABASE_URL || "file:./data/onera.db";

// Detect database type from URL
export const isPostgres =
  dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

// Type for the unified database interface
// We use the SQLite types as the base since that's the default development database
// At runtime, both SQLite and PostgreSQL provide compatible query interfaces
type UnifiedDatabase = BunSQLiteDatabase<typeof schemaSqlite>;

// Create the appropriate database connection
function createDatabase(): UnifiedDatabase {
  if (isPostgres) {
    // PostgreSQL connection
    const pool = new pg.Pool({
      connectionString: dbUrl,
      max: 10, // Connection pool size
    });

    // Cast to unified type - Drizzle ORM provides compatible interfaces at runtime
    return drizzlePg(pool, { schema: schemaPg }) as unknown as UnifiedDatabase;
  } else {
    // SQLite connection
    // Remove file: prefix if present
    const dbPath = dbUrl.replace(/^file:/, "");

    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create SQLite database connection using Bun's native SQLite
    const sqlite = new Database(dbPath);

    // Production SQLite optimizations
    sqlite.run("PRAGMA journal_mode = WAL"); // Better concurrent performance
    sqlite.run("PRAGMA foreign_keys = ON"); // Enforce referential integrity
    sqlite.run("PRAGMA synchronous = NORMAL"); // Good balance of safety/speed
    sqlite.run("PRAGMA cache_size = -64000"); // 64MB cache
    sqlite.run("PRAGMA busy_timeout = 5000"); // Wait 5s on lock contention
    sqlite.run("PRAGMA temp_store = MEMORY"); // Store temp tables in memory

    return drizzleSqlite(sqlite, { schema: schemaSqlite });
  }
}

export const db = createDatabase();

// Export the schema for use in auth and other places
// Use the appropriate schema based on database type
export const schema = isPostgres ? schemaPg : schemaSqlite;

// Re-export individual tables for convenient imports in routers
// These provide type information; actual queries work with both databases
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
} = schemaSqlite;

// Type for the database
export type DrizzleDatabase = typeof db;
