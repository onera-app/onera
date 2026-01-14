import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// DATABASE_URL format: file:./data/onera.db or file:/app/data/onera.db
const dbUrl = process.env.DATABASE_URL || "file:./data/onera.db";
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
sqlite.run("PRAGMA journal_mode = WAL");        // Better concurrent performance
sqlite.run("PRAGMA foreign_keys = ON");         // Enforce referential integrity
sqlite.run("PRAGMA synchronous = NORMAL");      // Good balance of safety/speed
sqlite.run("PRAGMA cache_size = -64000");       // 64MB cache
sqlite.run("PRAGMA busy_timeout = 5000");       // Wait 5s on lock contention
sqlite.run("PRAGMA temp_store = MEMORY");       // Store temp tables in memory

export const db = drizzle(sqlite, { schema });

export type DrizzleDatabase = typeof db;
