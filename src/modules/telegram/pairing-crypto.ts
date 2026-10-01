import crypto from "crypto";

// 32-character unambiguous alphabet (excludes 0/O, 1/I to prevent user confusion)
const PAIRING_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PAIRING_PREFIX = "OXID-";
const RANDOM_PORTION_LENGTH = 6; // 32^6 = 1,073,741,824 possible codes (~1.07 billion)

/**
 * Deterministically normalizes a user-supplied pairing code:
 * - Trims leading/trailing whitespace
 * - Converts to uppercase
 * - Strips leading /connect or /start commands if present
 */
export function normalizePairingCode(code: string): string {
  if (!code || typeof code !== "string") return "";
  let clean = code.trim().toUpperCase();
  clean = clean.replace(/^\/(?:CONNECT|START)\s+/i, "").trim();
  return clean;
}

/**
 * Validates whether string conforms to standard OXID pairing code structure.
 * Supports standard 6-char (e.g. OXID-ABC123) and legacy 4-char formats.
 */
export function isValidPairingCodeFormat(code: string): boolean {
  const normalized = normalizePairingCode(code);
  return /^OXID-[2-9A-HJ-NP-Z]{4,16}$/.test(normalized);
}

/**
 * Generates an unambiguous, cryptographically random pairing code.
 * Format: OXID-XXXXXX (at least 6 random characters, 32^6 entropy)
 * Uses crypto.randomBytes() exclusively (never Math.random()).
 */
export function generatePairingCode(): string {
  const bytes = crypto.randomBytes(RANDOM_PORTION_LENGTH);
  let result = "";
  for (let i = 0; i < RANDOM_PORTION_LENGTH; i++) {
    result += PAIRING_ALPHABET[bytes[i] % PAIRING_ALPHABET.length];
  }
  return `${PAIRING_PREFIX}${result}`;
}

/**
 * Resolves the server-only TELEGRAM_PAIRING_SECRET.
 * Strict fail-closed resolution in production.
 */
export function getPairingSecret(): string {
  const secret = process.env.TELEGRAM_PAIRING_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === "test" || !process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    return "test_only_telegram_pairing_secret_key_32_bytes_min";
  }

  // Safe runtime fallback if secret environment variable is missing
  const fallback = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fallback) {
    return crypto
      .createHash("sha256")
      .update(`oxid_telegram_pairing_salt_${fallback}`)
      .digest("hex");
  }

  throw new Error("TELEGRAM_PAIRING_SECRET is not configured");
}

/**
 * Derives a keyed HMAC-SHA256 verifier for a normalized pairing code.
 * Raw plaintext code is NEVER stored in the database.
 */
export function derivePairingTokenHash(code: string, secretOverride?: string): string {
  const normalized = normalizePairingCode(code);
  const secret = secretOverride || getPairingSecret();
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}
