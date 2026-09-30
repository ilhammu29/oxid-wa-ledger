/**
 * Product Normalizer for OXID WA Ledger.
 * Step 6C: Deterministic normalization of product phrases and aliases without LLMs.
 */

/**
 * Normalizes a product phrase or raw message fragment deterministically.
 * - lowercase
 * - trim
 * - collapse whitespace
 * - strip extraneous punctuation while preserving alphanumerics & meaningful hyphens
 */
export function normalizeProductTerm(term: string): string {
  if (!term) return "";
  return term
    .toLowerCase()
    .normalize("NFKD")
    // Keep letters, numbers, and hyphens; replace other punctuation and symbols with spaces
    .replace(/[^\p{L}\p{N}\-]/gu, " ")
    // Collapse hyphens surrounded by spaces or leading/trailing hyphens
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escapes characters for safe usage in RegExp.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
