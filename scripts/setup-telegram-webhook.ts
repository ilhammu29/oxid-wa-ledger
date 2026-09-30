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
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!botToken || !webhookSecret) {
    console.error("Error: TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET is missing.");
    process.exit(1);
  }

  const webhookUrl = "https://oxid-wa-ledger.vercel.app/api/webhooks/telegram";
  const allowedUpdates = ["message"];
  const dropPendingUpdates = true;

  const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: allowedUpdates,
        drop_pending_updates: dropPendingUpdates,
      }),
    });

    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      result?: boolean;
      description?: string;
      error_code?: number;
    } | null;

    const isOk = res.ok && json?.ok === true;

    console.log("\n=== Telegram Webhook Setup ===");
    console.log(`Webhook set:              ${isOk ? "YES" : "NO"}`);
    console.log(`URL:                      ${webhookUrl}`);
    console.log(`Allowed updates:          ${JSON.stringify(allowedUpdates)}`);
    console.log(`Telegram response status: ${res.status} ${json?.description || "OK"}\n`);

    if (!isOk) {
      process.exit(1);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\n=== Telegram Webhook Setup ===");
    console.log("Webhook set:              NO");
    console.log(`URL:                      ${webhookUrl}`);
    console.log(`Allowed updates:          ${JSON.stringify(allowedUpdates)}`);
    console.log(`Telegram response status: Exception (${msg})\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
