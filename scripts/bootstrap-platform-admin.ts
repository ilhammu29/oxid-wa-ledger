/**
 * Platform Admin Bootstrap CLI
 * STEP 9.1.1A: OXID Ledger Platform Admin Activation
 *
 * Promotes a verified Supabase auth user to the public.platform_admins table.
 *
 * Requirements:
 * 1. Must be run explicitly with --email <email> and --confirm.
 * 2. Never guesses or auto-promotes users.
 * 3. Fails closed if user does not exist in Supabase auth.
 * 4. Fails closed if --confirm is missing.
 *
 * Usage:
 *   npm run admin:bootstrap -- --email <email> --confirm [--role super_admin]
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

// 1. Load environment variables (.env.local, .env)
const envFiles = [".env.local", ".env"];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

function printUsage() {
  console.log(`
OXID Ledger - Platform Admin Bootstrap CLI
==========================================
Usage:
  npm run admin:bootstrap -- --email <email> --confirm [--role super_admin]

Options:
  --email <email>   The email address of the existing Supabase auth user (required)
  --confirm         Explicit confirmation flag required for safety (required)
  --role <role>     Platform role: super_admin | support_admin | billing_admin | viewer (default: super_admin)
  --help            Show this help message
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  let email: string | null = null;
  let confirm = false;
  let role = "super_admin";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" && i + 1 < args.length) {
      email = args[i + 1].trim().toLowerCase();
      i++;
    } else if (arg.startsWith("--email=")) {
      email = arg.split("=")[1].trim().toLowerCase();
    } else if (arg === "--confirm") {
      confirm = true;
    } else if (arg === "--role" && i + 1 < args.length) {
      role = args[i + 1].trim().toLowerCase();
      i++;
    } else if (arg.startsWith("--role=")) {
      role = arg.split("=")[1].trim().toLowerCase();
    }
  }

  if (!email) {
    console.error("❌ Error: Missing --email parameter.");
    printUsage();
    process.exit(1);
  }

  const validRoles = ["super_admin", "support_admin", "billing_admin", "viewer"];
  if (!validRoles.includes(role)) {
    console.error(`❌ Error: Invalid role '${role}'. Allowed roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  if (!confirm) {
    console.error("❌ Error: Confirmation required. You must pass the --confirm flag to execute promotion.");
    console.error(`   Example: npm run admin:bootstrap -- --email ${email} --confirm`);
    process.exit(1);
  }

  console.log("==================================================");
  console.log("OXID LEDGER: PLATFORM ADMIN BOOTSTRAP");
  console.log("==================================================");
  console.log(`Target Email : ${email}`);
  console.log(`Target Role  : ${role}`);
  console.log(`Confirmation : VERIFIED`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.TEST_DB_URL || "postgres://postgres:postgres@127.0.0.1:55435/postgres";

  let userId: string | null = null;
  let userEmail: string | null = null;

  // Step 1: Locate user in auth.users
  console.log("\n1. Verifying user in Supabase auth...");

  // Try via Supabase Admin Client
  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      // Query auth user
      const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
      if (!userErr && usersData?.users) {
        const found = usersData.users.find((u) => u.email?.toLowerCase() === email);
        if (found) {
          userId = found.id;
          userEmail = found.email || email;
        }
      }
    } catch {
      // Fallback to direct DB query below
    }
  }

  // Fallback to direct PG client if admin client didn't resolve
  if (!userId && dbUrl) {
    try {
      const pgClient = new Client({ connectionString: dbUrl });
      await pgClient.connect();
      const res = await pgClient.query(
        "SELECT id, email FROM auth.users WHERE lower(email) = lower($1) LIMIT 1",
        [email]
      );
      if (res.rows.length > 0) {
        userId = res.rows[0].id;
        userEmail = res.rows[0].email;
      }
      await pgClient.end();
    } catch {
      // Handled below
    }
  }

  if (!userId) {
    console.error(`❌ Error: User with email '${email}' does not exist in Supabase auth.`);
    console.error("   The user must first register an account or be invited before being promoted.");
    process.exit(1);
  }

  console.log(`✅ Found Supabase Auth User:`);
  console.log(`   User ID : ${userId}`);
  console.log(`   Email   : ${userEmail}`);

  // Step 2: Insert or update platform_admins table
  console.log("\n2. Promoting user to public.platform_admins...");

  let updated = false;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabase
        .from("platform_admins")
        .upsert(
          {
            user_id: userId,
            email: userEmail,
            role,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (!error && data) {
        updated = true;
      } else if (error) {
        console.warn(`   Supabase upsert note: ${error.message}. Trying direct DB...`);
      }
    } catch (err: unknown) {
      console.warn(`   Supabase client error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!updated && dbUrl) {
    const pgClient = new Client({ connectionString: dbUrl });
    await pgClient.connect();
    await pgClient.query(
      `
      INSERT INTO public.platform_admins (user_id, email, role, active, updated_at)
      VALUES ($1, $2, $3, true, now())
      ON CONFLICT (user_id)
      DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        active = true,
        updated_at = now();
    `,
      [userId, userEmail, role]
    );
    await pgClient.end();
    updated = true;
  }

  if (!updated) {
    console.error("❌ Error: Failed to insert or update platform_admins.");
    process.exit(1);
  }

  console.log("✅ Platform Admin successfully activated!");
  console.log("==================================================");
  console.log("SUMMARY OF OPERATIONAL ADMIN RECORD:");
  console.log(`  User ID   : ${userId}`);
  console.log(`  Email     : ${userEmail}`);
  console.log(`  Role      : ${role}`);
  console.log(`  Status    : ACTIVE`);
  console.log(`  Timestamp : ${new Date().toISOString()}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("❌ Fatal error during admin bootstrap:", err);
  process.exit(1);
});
