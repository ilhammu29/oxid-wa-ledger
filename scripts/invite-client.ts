import { createClient } from "@supabase/supabase-js";
import { createClientInvite } from "../src/modules/onboarding/invite";
import * as fs from "fs";
import * as path from "path";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let email = "";

  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      email = arg.substring("--email=".length).trim();
    }
  }

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run invite:client -- --email=client@example.com");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Resolve a creator user id (fallback to first user or system uuid)
  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  const creatorId = usersData?.users?.[0]?.id || "00000000-0000-0000-0000-000000000001";

  const result = await createClientInvite(supabase, {
    email,
    createdBy: creatorId,
    expiresInDays: 7,
    baseUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://oxid-wa-ledger.vercel.app",
  });

  if (!result.success) {
    console.error("Failed to generate onboarding invite:", result.error);
    process.exit(1);
  }

  console.log("\n==================================================");
  console.log("CLIENT ONBOARDING INVITE GENERATED");
  console.log("==================================================");
  console.log(`Email      : ${email}`);
  console.log(`Expires At : ${result.expiresAt}`);
  console.log(`Invite URL : ${result.inviteUrl}`);
  console.log("==================================================\n");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
