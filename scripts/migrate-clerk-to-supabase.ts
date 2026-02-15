/**
 * Clerk → Supabase User Migration Script
 *
 * Usage: CLERK_SECRET_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx DATABASE_URL=xxx bun run scripts/migrate-clerk-to-supabase.ts
 *
 * This script:
 * 1. Exports all users from Clerk
 * 2. Creates them in Supabase Auth
 * 3. Updates all userId columns in the database
 * 4. Inserts rows into the users table
 *
 * IMPORTANT: Run this during a maintenance window. All Clerk sessions will be
 * invalidated and users will need to re-login with Supabase Auth.
 */

import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

// Configuration
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
});

interface UserMapping {
  clerkId: string;
  supabaseId: string;
  email: string;
  name: string;
  role: string;
  imageUrl: string | null;
}

async function main() {
  console.log("=== Clerk → Supabase User Migration ===\n");

  // Step 1: Fetch all Clerk users
  console.log("Step 1: Fetching Clerk users...");
  const clerkUsers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await clerkClient.users.getUserList({ limit, offset });
    clerkUsers.push(...batch.data);
    if (batch.data.length < limit) break;
    offset += limit;
  }

  console.log(`  Found ${clerkUsers.length} users\n`);

  // Step 2: Create users in Supabase Auth and build mapping
  console.log("Step 2: Creating users in Supabase Auth...");
  const mappings: UserMapping[] = [];
  const errors: { clerkId: string; error: string }[] = [];

  for (const clerkUser of clerkUsers) {
    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!email) {
      errors.push({ clerkId: clerkUser.id, error: "No primary email" });
      continue;
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0] ||
      "User";

    const role =
      (clerkUser.publicMetadata as Record<string, unknown>)?.role === "admin"
        ? "admin"
        : "user";

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          first_name: clerkUser.firstName,
          last_name: clerkUser.lastName,
          name,
          avatar_url: clerkUser.imageUrl,
        },
      });

      if (error) {
        errors.push({ clerkId: clerkUser.id, error: error.message });
        continue;
      }

      mappings.push({
        clerkId: clerkUser.id,
        supabaseId: data.user.id,
        email,
        name,
        role,
        imageUrl: clerkUser.imageUrl,
      });

      console.log(`  ${email}: ${clerkUser.id} -> ${data.user.id}`);
    } catch (err) {
      errors.push({
        clerkId: clerkUser.id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  console.log(`\n  Migrated: ${mappings.length}, Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log("  Errors:");
    for (const e of errors) {
      console.log(`    ${e.clerkId}: ${e.error}`);
    }
  }

  if (mappings.length === 0) {
    console.log("\nNo users to migrate. Exiting.");
    process.exit(0);
  }

  // Step 3: Update all userId columns in a single transaction
  console.log("\nStep 3: Updating userId columns in database...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Create temporary mapping table
    await client.query(`
      CREATE TEMP TABLE user_id_mapping (
        clerk_id TEXT PRIMARY KEY,
        supabase_id TEXT NOT NULL
      )
    `);

    // Insert mappings
    for (const m of mappings) {
      await client.query(
        "INSERT INTO user_id_mapping (clerk_id, supabase_id) VALUES ($1, $2)",
        [m.clerkId, m.supabaseId]
      );
    }

    // Update all tables
    const tables = [
      { table: "key_shares", column: "user_id" },
      { table: "devices", column: "user_id" },
      { table: "webauthn_credentials", column: "user_id" },
      { table: "folders", column: "user_id" },
      { table: "chats", column: "user_id" },
      { table: "notes", column: "user_id" },
      { table: "credentials", column: "user_id" },
      { table: "prompts", column: "user_id" },
      { table: "subscriptions", column: "user_id" },
      { table: "invoices", column: "user_id" },
      { table: "usage_records", column: "user_id" },
      { table: "enclave_assignments", column: "user_id" },
      { table: "enclaves", column: "dedicated_to_user_id" },
    ];

    for (const { table, column } of tables) {
      const result = await client.query(`
        UPDATE ${table}
        SET ${column} = m.supabase_id
        FROM user_id_mapping m
        WHERE ${table}.${column} = m.clerk_id
      `);
      console.log(`  ${table}.${column}: ${result.rowCount} rows updated`);
    }

    // Step 4: Insert into users table
    console.log("\nStep 4: Populating users table...");
    for (const m of mappings) {
      await client.query(
        `INSERT INTO users (id, email, name, image_url, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [m.supabaseId, m.email, m.name, m.imageUrl, m.role]
      );
    }
    console.log(`  Inserted ${mappings.length} rows into users table`);

    await client.query("COMMIT");
    console.log("\nMigration committed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nMigration rolled back due to error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }

  // Summary
  console.log("\n=== Migration Summary ===");
  console.log(`Users migrated: ${mappings.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log("\nNext steps:");
  console.log("1. Deploy the new Supabase Auth code");
  console.log("2. Verify E2EE unlock works on a test account");
  console.log("3. Remove maintenance mode");
  console.log("4. Users will need to re-login (all Clerk sessions are now invalid)");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
