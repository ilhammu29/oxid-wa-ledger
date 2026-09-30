import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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

function parseArgs() {
  const args = process.argv.slice(2);
  let businessId: string | undefined;
  let telegramUserId: string | undefined;
  let label = "Owner / Operator";

  for (const arg of args) {
    if (arg.startsWith("--business-id=")) {
      businessId = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--telegram-user-id=")) {
      telegramUserId = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--label=")) {
      label = arg.split("=")[1]?.trim();
    }
  }

  return { businessId, telegramUserId, label };
}

async function main() {
  const { businessId, telegramUserId, label } = parseArgs();

  if (!businessId || !telegramUserId) {
    console.error("Usage: npm run setup:telegram -- --business-id=<uuid> --telegram-user-id=<numeric-id> [--label=<label>]");
    process.exit(1);
  }

  // Validate Telegram user ID is numeric
  if (!/^\d+$/.test(telegramUserId)) {
    console.error(`Error: Telegram User ID must be digits only (got: "${telegramUserId}").`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Verify business exists
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .maybeSingle();

  if (bizErr || !business) {
    console.error(`Error: Business not found with ID "${businessId}".`);
    process.exit(1);
  }

  // 2. Upsert telegram_authorized_users record
  const numericId = Number(telegramUserId);
  const { data: existingUser } = await supabase
    .from("telegram_authorized_users")
    .select("id, active")
    .eq("business_id", businessId)
    .eq("telegram_user_id", numericId)
    .maybeSingle();

  let resultId: string;

  if (existingUser) {
    const { data: updated, error: updateErr } = await supabase
      .from("telegram_authorized_users")
      .update({
        active: true,
        display_label: label,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select("id")
      .single();

    if (updateErr) {
      console.error(`Error updating Telegram user: ${updateErr.message}`);
      process.exit(1);
    }
    resultId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("telegram_authorized_users")
      .insert({
        business_id: businessId,
        telegram_user_id: numericId,
        display_label: label,
        active: true,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error(`Error registering Telegram user: ${insertErr.message}`);
      process.exit(1);
    }
    resultId = inserted.id;
  }

  console.log("\n=== Telegram Authorized User Setup Complete ===");
  console.log(`Business Name:      ${business.name}`);
  console.log(`Business ID:        ${business.id}`);
  console.log(`Telegram User ID:   ${telegramUserId}`);
  console.log(`Display Label:      ${label}`);
  console.log(`Status:             ACTIVE`);
  console.log(`Authorization ID:   ${resultId}\n`);
}

main().catch((err) => {
  console.error("Fatal error during Telegram setup:", err);
  process.exit(1);
});
