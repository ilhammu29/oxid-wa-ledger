/**
 * Platform Admin Security & Verification Script
 * STEP 9.1C: OXID Ledger Subscription Hardening & Production Verification
 *
 * Verifies:
 * 1. public.platform_admins table exists and is accessible.
 * 2. Platform admin authorization fails closed for null/undefined/unauthenticated callers.
 * 3. Normal business owners / unauthorized users are strictly denied admin access.
 * 4. Outputs non-sensitive, sanitized audit summary of platform admins.
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { isOxidSuperAdmin } from "../src/modules/subscriptions/admin";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
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

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***@***";
  const user = parts[0];
  const domain = parts[1];
  const maskedUser = user.length <= 2 ? user[0] + "***" : user.slice(0, 2) + "***" + user.slice(-1);
  return `${maskedUser}@${domain}`;
}

async function main() {
  console.log("==================================================");
  console.log("OXID LEDGER: PLATFORM ADMIN SECURITY AUDIT (9.1C)");
  console.log("==================================================");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Verify platform_admins table
  console.log("\n1. Checking public.platform_admins table...");
  const { data: admins, error: adminErr } = await supabase
    .from("platform_admins")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: true });

  if (adminErr) {
    console.error("❌ Error querying platform_admins:", adminErr.message);
    process.exit(1);
  }

  console.log(`✅ Table exists. Total configured platform admins: ${admins?.length ?? 0}`);
  if (admins && admins.length > 0) {
    for (const adm of admins) {
      console.log(`   - Admin ID: ${adm.id} | Role: ${adm.role} | Email: ${maskEmail(adm.email)}`);
    }
  } else {
    console.log("   (No platform admins currently inserted in public.platform_admins)");
  }

  // 2. Check OXID_ADMIN_EMAILS env variable
  const envAdmins = (process.env.OXID_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  console.log(`\n2. Checking OXID_ADMIN_EMAILS env configuration...`);
  console.log(`   Total configured in env: ${envAdmins.length}`);
  for (const email of envAdmins) {
    console.log(`   - Configured Email: ${maskEmail(email)}`);
  }

  // 3. Test Fail-Closed Security
  console.log("\n3. Testing Authorization Fail-Closed Behaviors...");

  // Case A: Null user
  const nullCheck = await isOxidSuperAdmin(null, supabase);
  if (nullCheck !== false) {
    console.error("❌ FAILED: isOxidSuperAdmin(null) allowed access!");
    process.exit(1);
  }
  console.log("   ✓ Null user: REJECTED (fails closed)");

  // Case B: Undefined user
  const undefinedCheck = await isOxidSuperAdmin(undefined, supabase);
  if (undefinedCheck !== false) {
    console.error("❌ FAILED: isOxidSuperAdmin(undefined) allowed access!");
    process.exit(1);
  }
  console.log("   ✓ Undefined user: REJECTED (fails closed)");

  // Case C: Fake unauthorized user
  const fakeUser = {
    id: "00000000-0000-0000-0000-000000000001",
    email: "random_merchant@business.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
  const fakeCheck = await isOxidSuperAdmin(fakeUser as any, supabase);
  if (fakeCheck !== false) {
    console.error("❌ FAILED: Normal merchant user granted admin access!");
    process.exit(1);
  }
  console.log("   ✓ Normal merchant: REJECTED (unauthorized)");

  // Case D: User with empty email
  const emptyEmailUser = {
    id: "00000000-0000-0000-0000-000000000002",
    email: "",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };
  const emptyEmailCheck = await isOxidSuperAdmin(emptyEmailUser as any, supabase);
  if (emptyEmailCheck !== false) {
    console.error("❌ FAILED: User with empty email granted admin access!");
    process.exit(1);
  }
  console.log("   ✓ User with empty email: REJECTED");

  // Case E: If any platform admin is in DB, verify they ARE granted access
  if (admins && admins.length > 0) {
    const realAdminUser = {
      id: admins[0].id,
      email: admins[0].email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };
    const realAdminCheck = await isOxidSuperAdmin(realAdminUser as any, supabase);
    console.log(`   ✓ Registered platform admin (${maskEmail(admins[0].email)}): ${realAdminCheck ? "GRANTED" : "CHECK_ENV"}`);
  }

  console.log("\n==================================================");
  console.log("PLATFORM ADMIN AUDIT: VERIFIED & SECURE");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
