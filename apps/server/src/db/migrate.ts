import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { db } from "./client";

async function runMigrations() {
  console.log("Running PostgreSQL migrations...");

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  console.log("Migrations complete!");

  // Verify critical tables exist (pgbouncer transaction mode can silently drop DDL)
  console.log("Verifying table integrity...");
  const result = await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const existingTables = new Set(result.rows.map((r: Record<string, unknown>) => r.table_name));
  console.log(`Found ${existingTables.size} tables in public schema`);

  // Ensure api_tokens table exists (migration 0025/0026 may have been swallowed by pgbouncer)
  if (!existingTables.has("api_tokens")) {
    console.log("Creating missing api_tokens table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "api_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "name" text NOT NULL DEFAULT 'Default',
        "token_hash" text NOT NULL,
        "token_prefix" text NOT NULL,
        "last_used_at" timestamp,
        "revoked_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_api_tokens_user_id" ON "api_tokens" USING btree ("user_id")`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "idx_api_tokens_token_hash" ON "api_tokens" USING btree ("token_hash")`);
    await db.execute(sql`ALTER TABLE "api_tokens" ENABLE ROW LEVEL SECURITY`);
    console.log("api_tokens table created successfully");
  }

  console.log("All tables verified!");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
