import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyHubChallenge,
  verifyMetaSignature,
  processIncomingWhatsAppWebhook,
  MetaWebhookPayload,
} from "@/modules/whatsapp";

export const dynamic = "force-dynamic";

// Maximum allowable raw body size (512 KB) to prevent unbounded memory usage
const MAX_BODY_BYTES = 512 * 1024;

/**
 * GET /api/webhooks/whatsapp
 * Meta Webhook Verification Handshake
 *
 * Checks hub.mode, hub.verify_token against WHATSAPP_VERIFY_TOKEN using constant-time comparison,
 * and echoes back hub.challenge as plain text.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!expectedToken) {
    console.error("[Webhook GET] WHATSAPP_VERIFY_TOKEN is not configured on the server.");
    return new Response("Server configuration error", { status: 500 });
  }

  const isValid = verifyHubChallenge(mode, verifyToken, expectedToken);

  if (isValid && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  console.warn("[Webhook GET] Webhook verification failed (invalid token or mode)");
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Incoming Meta WhatsApp Cloud API Webhook Events
 *
 * CRITICAL FLOW:
 * 1. Read raw request text before parsing JSON
 * 2. Verify X-Hub-Signature-256 with META_APP_SECRET
 * 3. Enforce payload size safety limit
 * 4. Delegate to orchestration pipeline
 * 5. Return HTTP 200 to acknowledge Meta delivery
 */
export async function POST(request: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret) {
    console.error("[Webhook POST] META_APP_SECRET is not configured on the server.");
    return new Response("Server configuration error", { status: 500 });
  }

  // 1. Read raw body text for cryptographic verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook POST] Failed to read request body: ${msg}`);
    return new Response("Failed to read body", { status: 400 });
  }

  // 2. Body size safety bound
  if (Buffer.byteLength(rawBody, "utf-8") > MAX_BODY_BYTES) {
    console.warn("[Webhook POST] Payload exceeds maximum allowed size (512KB)");
    return new Response("Payload too large", { status: 413 });
  }

  // 3. Cryptographic Signature Verification
  const signatureHeader = request.headers.get("x-hub-signature-256");
  const isSignatureValid = verifyMetaSignature(rawBody, signatureHeader, appSecret);

  if (!isSignatureValid) {
    console.warn("[Webhook POST] Invalid or missing X-Hub-Signature-256. Request rejected.");
    return new Response("Unauthorized", { status: 401 });
  }

  // 4. Parse JSON payload
  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MetaWebhookPayload;
  } catch {
    console.warn("[Webhook POST] Malformed JSON in webhook payload");
    return new Response("Malformed JSON", { status: 400 });
  }

  // 5. Initialize Server-to-Server Supabase Client (Service Role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[Webhook POST] Missing Supabase server credentials.");
    return new Response("Server configuration error", { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 6. Process message through safe pipeline
  try {
    const result = await processIncomingWhatsAppWebhook(supabaseAdmin, payload);
    return NextResponse.json({ success: true, type: result.type }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook POST] Internal error in webhook processor: ${errorMsg}`);
    // Acknowledge HTTP 200 to prevent endless retry storms on irrecoverable runtime bugs
    return NextResponse.json({ success: false, error: "Internal processing error" }, { status: 200 });
  }
}
