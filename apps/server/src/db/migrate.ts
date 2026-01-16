import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

async function runMigrations() {
  console.log("Running PostgreSQL migrations...");

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  console.log("Migrations complete!");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
