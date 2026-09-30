import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { normalizePhoneNumber, maskPhoneNumber } from "../src/modules/whatsapp/phone";

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
  let sender: string | undefined;
  let label = "Owner / Primary Operator";

  for (const arg of args) {
    if (arg.startsWith("--business-id=")) {
      businessId = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--sender=")) {
      sender = arg.split("=")[1]?.trim();
    } else if (arg.startsWith("--label=")) {
      label = arg.split("=")[1]?.trim();
    }
  }

  return { businessId, sender, label };
}

async function main() {
  const { businessId, sender, label } = parseArgs();

  if (!businessId || !sender) {
    console.error("Usage: npm run setup:whatsapp -- --business-id=<uuid> --sender=<phone> [--label=<label>]");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const wabaId = process.env.WHATSAPP_WABA_ID;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
    process.exit(1);
  }

  if (!phoneNumberId) {
    console.error("Error: WHATSAPP_PHONE_NUMBER_ID is not configured in environment.");
    process.exit(1);
  }

  let normalizedPhone: string;
  try {
    normalizedPhone = normalizePhoneNumber(sender);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Invalid sender phone: ${msg}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Verify business existence
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("id", businessId)
    .maybeSingle();

  if (bizErr || !business) {
    console.error(`Business not found for ID: ${businessId}`);
    process.exit(1);
  }

  console.log(`Setting up WhatsApp for Business: "${business.name}" (${business.id})...`);

  // 2. Upsert WhatsApp connection
  const { error: connErr } = await supabase
    .from("whatsapp_connections")
    .upsert(
      {
        business_id: businessId,
        phone_number_id: phoneNumberId,
        phone_number: normalizedPhone,
        waba_id: wabaId || null,
        status: "connected",
      },
      { onConflict: "phone_number_id" }
    );

  if (connErr) {
    console.error(`Failed to link WhatsApp connection: ${connErr.message}`);
    process.exit(1);
  }

  // 3. Upsert authorized sender
  const { error: senderErr } = await supabase
    .from("whatsapp_authorized_senders")
    .upsert(
      {
        business_id: businessId,
        phone_number: normalizedPhone,
        display_label: label,
        active: true,
      },
      { onConflict: "business_id,phone_number" }
    );

  if (senderErr) {
    console.error(`Failed to authorize sender: ${senderErr.message}`);
    process.exit(1);
  }

  console.log("✓ WhatsApp connection linked successfully");
  console.log(`✓ Authorized sender added: ${maskPhoneNumber(normalizedPhone)} (${label})`);
  console.log("✓ Status: connected & active");
}

main().catch((err) => {
  console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
