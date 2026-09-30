import * as crypto from "crypto";

/**
 * Compares two UTF-8 strings in constant time to prevent timing attacks.
 */
export function safeCompareStrings(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Computes a standard Meta X-Hub-Signature-256 header value.
 * Used for testing and signature verification.
 */
export function computeMetaSignature(rawBody: string, appSecret: string): string {
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(rawBody, "utf-8");
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verifies that the incoming webhook request genuinely originated from Meta.
 *
 * Requirements:
 * - Header format: 'sha256=<64-hex-characters>'
 * - Uses HMAC-SHA256 with the app's App Secret
 * - Uses timingSafeEqual to avoid timing side-channels
 * - Operates strictly on raw, unmodified request bytes/text
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret || typeof rawBody !== "string") {
    return false;
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const receivedHash = signatureHeader.slice(7).trim();
  if (receivedHash.length !== 64) {
    return false;
  }

  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf-8")
    .digest("hex");

  return safeCompareStrings(receivedHash, expectedHash);
}

/**
 * Verifies the Meta Webhook setup challenge (GET request).
 *
 * Expected:
 * - hub.mode === 'subscribe'
 * - hub.verify_token matches WHATSAPP_VERIFY_TOKEN (constant-time check)
 */
export function verifyHubChallenge(
  mode: string | null | undefined,
  verifyToken: string | null | undefined,
  expectedVerifyToken: string
): boolean {
  if (mode !== "subscribe") {
    return false;
  }

  if (!verifyToken || !expectedVerifyToken) {
    return false;
  }

  return safeCompareStrings(verifyToken, expectedVerifyToken);
}
