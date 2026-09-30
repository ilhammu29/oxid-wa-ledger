/**
 * Dynamic Tenant-Scoped Product Resolver for OXID WA Ledger.
 * Step 6C: Resolves active products and aliases dynamically from the database
 * without hardcoding or LLMs.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeProductTerm, escapeRegExp } from "./normalizer";
import {
  ProductWithAliases,
  ProductResolutionResult,
} from "./types";
import {
  formatMultiProductDetected,
  formatAmbiguousProductMatch,
  formatUnknownProduct,
} from "../conversation/response-formatter";

/**
 * Common stopwords, filler words, connectives, and sale verbs in Indonesian
 * to distinguish generic sale commands from explicit unknown products.
 */
const SALE_VERB_PATTERNS = [
  /\b(?:kejual|terjual|jual|jualan|dijual|laku|pembeli|ada pembeli|orang beli|orang ambil|orang|ambil|beli|dibeli|penjualan|keluar|habis|masuk|catat|masukin|tambah|input|buatkan|tolong|buat|bantu|min|gan|bos|mas|om|kak|bang|bro|pak|bu)\b/gi,
];

const STOPWORDS_PATTERNS = [
  /\b(?:dan|di|ke|dari|pada|yang|ini|itu|tadi|hari|kemarin|pagi|siang|sore|malam|barusan|baru|udah|sudah|ada|lagi|dong|deh|ya|saja|aja|nih|tuh|total|sebesar|senilai|rp|rupiah|dapat|dapet|dpt|sebanyak|seharga|dengan|untuk|sama|si|ga|gak|ngga|nggak|tidak|bisa|ok|oke|siap|kakak|bosku|agan)\b/gi,
];

const QUANTITY_AND_UNIT_PATTERNS = [
  /\b\d+(?:[.,]\d+)?\s*(?:kg|kilo|kilogram|ons|gram|ikat|ekor|liter|buah|biji|sak|dus|karung|pack|ton)?\b/gi,
  /\b(?:kg|kilo|kilogram|ons|gram|ikat|ekor|liter|buah|biji|sak|dus|karung|pack|ton)\b/gi,
];

/**
 * Loads all active products and active aliases for a specific tenant business.
 */
export async function getActiveProductsWithAliases(
  client: SupabaseClient,
  businessId: string
): Promise<ProductWithAliases[]> {
  const [productsRes, aliasesRes] = await Promise.all([
    client
      .from("products")
      .select("id, name, unit, default_price, active, is_default")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    client
      .from("product_aliases")
      .select("id, product_id, alias, normalized_alias, active")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ]);

  if (productsRes.error) {
    throw new Error(`Failed to fetch active products: ${productsRes.error.message}`);
  }

  const aliasesByProductId = new Map<
    string,
    Array<{ id: string; alias: string; normalizedAlias: string }>
  >();

  if (aliasesRes.data) {
    for (const a of aliasesRes.data) {
      const list = aliasesByProductId.get(a.product_id) || [];
      list.push({
        id: a.id,
        alias: a.alias,
        normalizedAlias: a.normalized_alias || normalizeProductTerm(a.alias),
      });
      aliasesByProductId.set(a.product_id, list);
    }
  }

  return (productsRes.data || []).map((p) => ({
    id: p.id,
    businessId,
    name: p.name,
    normalizedName: normalizeProductTerm(p.name),
    unit: p.unit,
    defaultPrice: Number(p.default_price),
    active: Boolean(p.active),
    isDefault: Boolean(p.is_default),
    aliases: aliasesByProductId.get(p.id) || [],
  }));
}

/**
 * Helper to fetch just active product names for a business.
 */
export async function getActiveProductNames(
  client: SupabaseClient,
  businessId: string
): Promise<string[]> {
  const { data, error } = await client
    .from("products")
    .select("name")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map((p) => p.name);
}

interface MatchCandidate {
  product: ProductWithAliases;
  phrase: string;
  isCanonical: boolean;
  matchIndex: number;
  matchLength: number;
}

/**
 * Resolves a product for a SALE command dynamically based on the tenant's database catalog.
 */
export async function resolveProductForSale(
  client: SupabaseClient,
  businessId: string,
  rawMessage: string
): Promise<ProductResolutionResult> {
  const activeProducts = await getActiveProductsWithAliases(client, businessId);
  const activeProductNames = activeProducts.map((p) => p.name);

  if (activeProducts.length === 0) {
    return {
      status: "NO_ACTIVE_PRODUCTS",
      activeProductNames: [],
      replyText: "Belum ada produk aktif yang terdaftar di sistem. Tambahkan produk melalui dashboard.",
    };
  }

  const norm = normalizeProductTerm(rawMessage);

  // --------------------------------------------------------------------------
  // Step 1: Search for Exact Phrase Matches (Canonical names & aliases)
  // --------------------------------------------------------------------------
  const directMatches: MatchCandidate[] = [];

  for (const product of activeProducts) {
    // 1. Canonical product name match
    if (product.normalizedName) {
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(product.normalizedName)}(?:[^\\p{L}\\p{N}]|$)`, "u");
      const match = regex.exec(norm);
      if (match) {
        directMatches.push({
          product,
          phrase: product.normalizedName,
          isCanonical: true,
          matchIndex: match.index,
          matchLength: product.normalizedName.length,
        });
      }
    }

    // 2. Active aliases match
    for (const alias of product.aliases) {
      const aliasNorm = alias.normalizedAlias;
      if (!aliasNorm) continue;
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(aliasNorm)}(?:[^\\p{L}\\p{N}]|$)`, "u");
      const match = regex.exec(norm);
      if (match) {
        directMatches.push({
          product,
          phrase: aliasNorm,
          isCanonical: false,
          matchIndex: match.index,
          matchLength: aliasNorm.length,
        });
      }
    }
  }

  // Filter out redundant sub-matches (e.g. if "nila merah" matched, don't also count "nila" if inside the same span)
  const nonOverlappingMatches: MatchCandidate[] = [];
  // Sort by matchLength descending so longest phrases take precedence
  directMatches.sort((a, b) => b.matchLength - a.matchLength);

  for (const match of directMatches) {
    const isContained = nonOverlappingMatches.some(
      (existing) =>
        existing.product.id !== match.product.id &&
        match.matchIndex >= existing.matchIndex &&
        match.matchIndex + match.matchLength <= existing.matchIndex + existing.matchLength
    );
    if (!isContained) {
      // Avoid duplicate matches for same product
      const alreadyHasProduct = nonOverlappingMatches.some((m) => m.product.id === match.product.id);
      if (!alreadyHasProduct) {
        nonOverlappingMatches.push(match);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Step 2: Multi-Product Check (Section 9)
  // --------------------------------------------------------------------------
  if (nonOverlappingMatches.length > 1) {
    // Multiple distinct products mentioned in the same message!
    const candidateNames = nonOverlappingMatches.map((m) => m.product.name);
    return {
      status: "MULTI_PRODUCT_DETECTED",
      candidateProducts: candidateNames,
      activeProductNames,
      replyText: formatMultiProductDetected(candidateNames),
    };
  }

  // --------------------------------------------------------------------------
  // Step 3: Single Direct Match (Section 5)
  // --------------------------------------------------------------------------
  if (nonOverlappingMatches.length === 1) {
    const matched = nonOverlappingMatches[0];
    return {
      status: "RESOLVED",
      product: {
        id: matched.product.id,
        name: matched.product.name,
        unit: matched.product.unit,
        defaultPrice: matched.product.defaultPrice,
        isDefault: matched.product.isDefault,
      },
      matchedPhrase: matched.phrase,
      activeProductNames,
    };
  }

  // --------------------------------------------------------------------------
  // Step 4: Check for Ambiguous Partial Product Match (Section 5)
  // Example: user said "nila", and products are "Nila Merah" and "Nila Hitam"
  // --------------------------------------------------------------------------
  // Extract individual content words from raw message
  let strippedForWords = norm;
  for (const pat of QUANTITY_AND_UNIT_PATTERNS) strippedForWords = strippedForWords.replace(pat, " ");
  for (const pat of SALE_VERB_PATTERNS) strippedForWords = strippedForWords.replace(pat, " ");
  for (const pat of STOPWORDS_PATTERNS) strippedForWords = strippedForWords.replace(pat, " ");
  const candidateWords = strippedForWords
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);

  for (const word of candidateWords) {
    const matchingProductsForWord = activeProducts.filter((p) => {
      const wordsInName = p.normalizedName.split(/\s+/);
      const wordsInAliases = p.aliases.flatMap((a) => a.normalizedAlias.split(/\s+/));
      return wordsInName.includes(word) || wordsInAliases.includes(word);
    });

    if (matchingProductsForWord.length > 1) {
      const candidateNames = matchingProductsForWord.map((p) => p.name);
      return {
        status: "AMBIGUOUS_PRODUCT",
        candidateProducts: candidateNames,
        activeProductNames,
        replyText: formatAmbiguousProductMatch(candidateNames),
      };
    } else if (matchingProductsForWord.length === 1) {
      const matched = matchingProductsForWord[0];
      return {
        status: "RESOLVED",
        product: {
          id: matched.id,
          name: matched.name,
          unit: matched.unit,
          defaultPrice: matched.defaultPrice,
          isDefault: matched.isDefault,
        },
        matchedPhrase: word,
        activeProductNames,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Step 5: Check for Explicit Unknown Product (Section 7)
  // "Kejual mujair 10kg" -> mujair is not registered -> return clarification
  // --------------------------------------------------------------------------
  let residualText = norm;
  for (const pat of QUANTITY_AND_UNIT_PATTERNS) residualText = residualText.replace(pat, " ");
  for (const pat of SALE_VERB_PATTERNS) residualText = residualText.replace(pat, " ");
  for (const pat of STOPWORDS_PATTERNS) residualText = residualText.replace(pat, " ");

  const residualTokens = residualText
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);

  if (residualTokens.length > 0) {
    const unknownTerm = residualTokens.join(" ");
    return {
      status: "UNKNOWN_PRODUCT",
      unknownTerm,
      activeProductNames,
      replyText: formatUnknownProduct(unknownTerm, activeProductNames),
    };
  }

  // --------------------------------------------------------------------------
  // Step 6: Default Product Behavior (Section 6)
  // No explicit product mentioned ("Kejual 10kg") -> use default product
  // --------------------------------------------------------------------------
  const defaultProduct = activeProducts.find((p) => p.isDefault);
  if (defaultProduct) {
    return {
      status: "DEFAULT_USED",
      product: {
        id: defaultProduct.id,
        name: defaultProduct.name,
        unit: defaultProduct.unit,
        defaultPrice: defaultProduct.defaultPrice,
        isDefault: true,
      },
      activeProductNames,
    };
  }

  return {
    status: "NO_DEFAULT_CONFIGURED",
    activeProductNames,
    replyText: "Belum ada produk default. Atur produk default melalui dashboard.",
  };
}
