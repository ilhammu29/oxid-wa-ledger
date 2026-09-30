import * as fs from "fs";
import * as path from "path";

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

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("=== Telegram Bot Verification ===");
    console.log("Bot Token:          INVALID (TELEGRAM_BOT_TOKEN missing in environment)");
    console.log("Bot username:       none");
    console.log("Webhook configured: NO");
    console.log("Webhook URL:        none");
    console.log("Pending updates:    0");
    console.log("Last webhook error: none\n");
    process.exit(1);
  }

  try {
    // 1. Check getMe
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = (await meRes.json().catch(() => null)) as {
      ok?: boolean;
      result?: { username?: string; first_name?: string };
      description?: string;
    } | null;

    const tokenValid = meRes.ok && meData?.ok === true;
    const botUsername = meData?.result?.username ? `@${meData.result.username}` : "none";

    // 2. Check getWebhookInfo
    let webhookConfigured = false;
    let webhookUrl = "none";
    let pendingUpdates = 0;
    let lastError = "none";

    if (tokenValid) {
      const whRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const whData = (await whRes.json().catch(() => null)) as {
        ok?: boolean;
        result?: {
          url?: string;
          has_custom_certificate?: boolean;
          pending_update_count?: number;
          last_error_date?: number;
          last_error_message?: string;
        };
      } | null;

      if (whRes.ok && whData?.ok && whData.result) {
        webhookUrl = whData.result.url || "none";
        webhookConfigured = Boolean(whData.result.url && whData.result.url.length > 0);
        pendingUpdates = whData.result.pending_update_count || 0;
        lastError = whData.result.last_error_message || "none";
      }
    }

    console.log("=== Telegram Bot Verification ===");
    console.log(`Bot Token:          ${tokenValid ? "VALID" : "INVALID"}`);
    console.log(`Bot username:       ${botUsername}`);
    console.log(`Webhook configured: ${webhookConfigured ? "YES" : "NO"}`);
    console.log(`Webhook URL:        ${webhookUrl}`);
    console.log(`Pending updates:    ${pendingUpdates}`);
    console.log(`Last webhook error: ${lastError}\n`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Exception verifying Telegram bot:", msg);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
