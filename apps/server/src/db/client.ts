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

// Enable WAL mode for better concurrent performance
sqlite.run("PRAGMA journal_mode = WAL");

// Enable foreign keys
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export type DrizzleDatabase = typeof db;
