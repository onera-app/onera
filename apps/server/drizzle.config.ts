import { defineConfig } from "drizzle-kit";

// DATABASE_URL format:
// - SQLite: file:./data/onera.db or just ./data/onera.db
// - PostgreSQL: postgres://user:pass@host:5432/db or postgresql://...
const dbUrl = process.env.DATABASE_URL || "file:./data/onera.db";

// Detect database type from URL
const isPostgres =
  dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

// Export appropriate config based on database type
export default isPostgres
  ? defineConfig({
      schema: "./src/db/schema-pg.ts",
      out: "./drizzle/migrations-pg",
      dialect: "postgresql",
      dbCredentials: {
        url: dbUrl,
      },
    })
  : defineConfig({
      schema: "./src/db/schema.ts",
      out: "./drizzle/migrations",
      dialect: "sqlite",
      dbCredentials: {
        // Remove file: prefix if present for drizzle-kit
        url: dbUrl.replace(/^file:/, ""),
      },
    });
