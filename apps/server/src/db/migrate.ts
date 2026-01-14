import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from "./client";

function runMigrations() {
  console.log("Running migrations...");
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Migrations complete!");
  process.exit(0);
}

try {
  runMigrations();
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
}
