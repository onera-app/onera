import { migrate as migrateSqlite } from "drizzle-orm/bun-sqlite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { db, isPostgres } from "./client";

async function runMigrations() {
  console.log(
    `Running migrations for ${isPostgres ? "PostgreSQL" : "SQLite"}...`
  );

  if (isPostgres) {
    await migratePg(db as any, { migrationsFolder: "./drizzle/migrations-pg" });
  } else {
    migrateSqlite(db as any, { migrationsFolder: "./drizzle/migrations" });
  }

  console.log("Migrations complete!");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
