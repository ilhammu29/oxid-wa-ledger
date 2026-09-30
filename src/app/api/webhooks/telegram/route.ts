import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyTelegramSecretToken,
  processIncomingTelegramWebhook,
  TelegramUpdate,
} from "@/modules/telegram";

export const dynamic = "force-dynamic";

// Maximum allowable raw body size (512 KB) to prevent unbounded memory usage
const MAX_BODY_BYTES = 512 * 1024;

/**
 * POST /api/webhooks/telegram
 * Incoming Telegram Bot API Webhook Updates
 *
 * CRITICAL FLOW:
 * 1. Read raw request text before parsing JSON
 * 2. Enforce payload size safety limit
 * 3. Verify X-Telegram-Bot-Api-Secret-Token with TELEGRAM_WEBHOOK_SECRET using timingSafeEqual
 * 4. Perform zero financial writes on secret mismatch (reject with 401)
 * 5. Delegate to orchestration pipeline
 * 6. Return HTTP 200 to acknowledge Telegram update delivery
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[Telegram Webhook POST] TELEGRAM_WEBHOOK_SECRET is not configured on the server runtime.");
    return new Response("Server configuration error", { status: 500 });
  }

  // 1. Read raw body text
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Telegram Webhook POST] Failed to read request body: ${msg}`);
    return new Response("Failed to read body", { status: 400 });
  }

  // 2. Body size safety bound
  if (Buffer.byteLength(rawBody, "utf-8") > MAX_BODY_BYTES) {
    console.warn("[Telegram Webhook POST] Payload exceeds maximum allowed size (512KB)");
    return new Response("Payload too large", { status: 413 });
  }

  // 3. Webhook Secret Token Verification (Timing-safe)
  const secretHeader =
    request.headers.get("x-telegram-bot-api-secret-token") ||
    request.headers.get("X-Telegram-Bot-Api-Secret-Token");

  const isSecretValid = verifyTelegramSecretToken(secretHeader, webhookSecret);

  if (!isSecretValid) {
    console.warn("[Telegram Webhook POST] Invalid or missing secret token header. Request rejected.");
    return new Response("Unauthorized", { status: 401 });
  }

  // 4. Parse JSON payload
  let update: TelegramUpdate;
  try {
    update = JSON.parse(rawBody) as TelegramUpdate;
  } catch {
    console.warn("[Telegram Webhook POST] Malformed JSON in webhook payload");
    return new Response("Malformed JSON", { status: 400 });
  }

  // 5. Initialize Server-to-Server Supabase Client (Service Role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[Telegram Webhook POST] Missing Supabase server credentials.");
    return new Response("Server configuration error", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 6. Process message through safe pipeline
  try {
    const result = await processIncomingTelegramWebhook(supabaseAdmin, update);
    return NextResponse.json({ ok: true, type: result.type }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Telegram Webhook POST] Internal error in webhook processor: ${errorMsg}`);
    // Acknowledge HTTP 200 to prevent endless retry storms on irrecoverable bugs
    return NextResponse.json({ ok: false, error: "Internal processing error" }, { status: 200 });
  }
}
