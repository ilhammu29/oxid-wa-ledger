import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("=== Production Supabase Accounting Diagnostic ===");

  // 1. Businesses
  const { data: businesses, error: busErr } = await supabase
    .from("businesses")
    .select("id, name, created_at, created_by");
  if (busErr) throw busErr;
  console.log(`Found ${businesses.length} businesses:`);
  for (const b of businesses) {
    console.log(` - [${b.id}] "${b.name}" (created_by: ${b.created_by})`);
  }

  // 2. Check journal_entries count
  const { count: jeCount, error: jeErr } = await supabase
    .from("journal_entries")
    .select("*", { count: "exact", head: true });
  if (jeErr) console.warn("journal_entries error:", jeErr.message);
  else console.log(`Total journal_entries: ${jeCount}`);

  // 3. Check journal_lines count
  const { count: jlCount, error: jlErr } = await supabase
    .from("journal_lines")
    .select("*", { count: "exact", head: true });
  if (jlErr) console.warn("journal_lines error:", jlErr.message);
  else console.log(`Total journal_lines: ${jlCount}`);

  // 4. Check for unbalance across journal_entries
  const { data: entries, error: entErr } = await supabase
    .from("journal_entries")
    .select("id, business_id, entry_number, status, total_debit, total_credit");
  if (entries && entries.length > 0) {
    let imbalanced = 0;
    for (const e of entries) {
      if (e.total_debit !== e.total_credit) {
        imbalanced++;
        console.warn(`Imbalanced entry ${e.entry_number}: D=${e.total_debit} C=${e.total_credit}`);
      }
    }
    console.log(`Entries check: ${entries.length} entries, ${imbalanced} imbalanced`);
  }

  // 5. Check orphan lines (lines without valid journal entry)
  const { data: orphanLines, error: orphErr } = await supabase.rpc("check_orphan_journal_lines").select();
  if (orphErr) {
    // If RPC doesn't exist, check manually
    const { data: lines } = await supabase.from("journal_lines").select("id, journal_entry_id").limit(500);
    console.log(`Manual check on sample ${lines?.length ?? 0} lines`);
  }

  // 6. Check products table schema & stock column
  const { data: sampleProducts, error: prodErr } = await supabase
    .from("products")
    .select("id, business_id, name, stock, unit_cost")
    .limit(5);
  if (prodErr) {
    console.error("products table error:", prodErr.message);
  } else {
    console.log("products sample:", sampleProducts);
  }

  // 7. Check platform admin / user details
  const { data: admins } = await supabase.from("platform_admins").select("*");
  console.log("platform_admins:", admins);

  // 8. Check telegram users / pairings
  const { data: tgUsers } = await supabase.from("telegram_users").select("id, telegram_user_id, business_id, is_active");
  console.log("telegram_users:", tgUsers);
}

main().catch(console.error);
