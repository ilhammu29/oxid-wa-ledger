import * as crypto from "crypto";

/**
 * Validates the X-Telegram-Bot-Api-Secret-Token header using constant-time comparison.
 *
 * Requirements:
 * - Reject missing secret
 * - Reject invalid secret
 * - Perform zero parser execution on invalid secret
 * - Never log the secret
 * - Use timing-safe comparison where practical
 */
export function verifyTelegramSecretToken(
  headerSecret: string | null | undefined,
  expectedSecret: string | null | undefined
): boolean {
  if (typeof headerSecret !== "string" || typeof expectedSecret !== "string") {
    return false;
  }

  if (!headerSecret || !expectedSecret) {
    return false;
  }

  const bufA = Buffer.from(headerSecret, "utf-8");
  const bufB = Buffer.from(expectedSecret, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
