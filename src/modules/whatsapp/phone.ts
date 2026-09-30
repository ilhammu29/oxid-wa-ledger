/**
 * Canonical phone normalization and masking utilities for OXID WA Ledger.
 * Ensures consistent E.164-compatible numbers and safe logging.
 */

/**
 * Normalizes phone numbers to a canonical digits-only international format.
 * - Strips leading '+'
 * - Strips whitespace, dashes, parentheses, dots
 * - Converts Indonesian national prefix ('08...') to international ('628...')
 * - Validates digits only (8 - 15 chars)
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return "";

  // Remove whitespace and formatting characters
  let cleaned = raw.replace(/[\s\-\(\)\.\,\/]/g, "").trim();

  // Strip leading '+'
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // Indonesian local prefix conversion (e.g. 0812... -> 62812...)
  if (cleaned.startsWith("08")) {
    cleaned = "628" + cleaned.slice(2);
  }

  // Verify only digits remain
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(`Invalid phone number characters: "${raw}"`);
  }

  // E.164 requires 8 to 15 digits
  if (cleaned.length < 8 || cleaned.length > 15) {
    throw new Error(
      `Phone number length must be between 8 and 15 digits (got ${cleaned.length} digits): "${raw}"`
    );
  }

  return cleaned;
}

/**
 * Masks a phone number for safe structured logging.
 * Example: 6281234567890 -> 62812****7890
 * Example: 16505551234 -> 1650****1234
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "[EMPTY]";
  const str = String(phone).replace(/\s+/g, "");
  if (str.length <= 6) return "***";

  const prefixLen = str.length >= 10 ? 5 : Math.max(2, Math.floor(str.length / 3));
  const suffixLen = str.length >= 10 ? 4 : Math.max(2, Math.floor(str.length / 3));

  const prefix = str.slice(0, prefixLen);
  const suffix = str.slice(-suffixLen);

  return `${prefix}****${suffix}`;
}
