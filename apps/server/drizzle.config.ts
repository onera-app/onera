import { defineConfig } from "drizzle-kit";

// DATABASE_URL format: file:./data/onera.db or just ./data/onera.db
const dbUrl = process.env.DATABASE_URL || "file:./data/onera.db";
// Remove file: prefix if present for drizzle-kit
const dbPath = dbUrl.replace(/^file:/, "");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
