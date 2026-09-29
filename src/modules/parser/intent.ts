/**
 * Deterministic Indonesian Intent Detector & Confidence Evaluator for OXID WA Ledger.
 * Step 3: Pure business logic without LLMs or external APIs.
 */

import {
  ParsedMessage,
} from "./types";
import { normalizeIndonesianText } from "./normalizer";
import { extractQuantities } from "./quantity";
import {
  SALE_KEYWORDS,
  STOCK_KEYWORDS,
  AMBIGUITY_KEYWORDS,
  REPORT_TODAY_PATTERNS,
  REPORT_WEEK_PATTERNS,
  REPORT_MONTH_PATTERNS,
  NO_SALE_PATTERNS,
  CLOSED_PATTERNS,
  CANCEL_LAST_PATTERNS,
  CORRECT_LAST_PATTERNS,
  HELP_PATTERNS,
} from "./keywords";

/**
 * Parses any incoming message deterministically into a structured ParsedMessage.
 *
 * Guaranteed properties:
 * - Pure function, zero side-effects.
 * - Never throws on malformed or unexpected text.
 * - Never calls LLM or network.
 * - Always serializable JSON.
 */
export function parseMessage(rawInput: string): ParsedMessage {
  const { normalizedText, isLengthExceeded, originalText } = normalizeIndonesianText(rawInput);

  // 1. Guard against empty / whitespace input
  if (!normalizedText) {
    return {
      intent: "UNKNOWN",
      confidence: "LOW",
      originalText,
      normalizedText: "",
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Pesan kosong atau hanya berisi spasi/simbol.",
      multipleQuantitiesDetected: false,
    };
  }

  // 2. Guard against excessive input length (ReDoS & payload size security)
  if (isLengthExceeded) {
    return {
      intent: "UNKNOWN",
      confidence: "LOW",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Panjang pesan melebihi batas maksimum 500 karakter.",
      multipleQuantitiesDetected: false,
    };
  }

  // 3. HELP Intent
  if (HELP_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "HELP",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["help"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Perintah bantuan / panduan terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 4. CANCEL_LAST Intent
  if (CANCEL_LAST_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "CANCEL_LAST",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["batal_terakhir"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan pembatalan transaksi terakhir terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 5. CORRECT_LAST Intent
  if (CORRECT_LAST_PATTERNS.some((p) => p.test(normalizedText))) {
    const { primaryQuantity } = extractQuantities(normalizedText);
    if (primaryQuantity) {
      return {
        intent: "CORRECT_LAST",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: primaryQuantity.unit,
        correctedQuantity: primaryQuantity.decimalString,
        rawCorrectedQuantity: primaryQuantity.rawNumber,
        matchedKeywords: ["koreksi_terakhir"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Permintaan koreksi transaksi terakhir menjadi ${primaryQuantity.rawNumber} kg.`,
        multipleQuantitiesDetected: false,
      };
    }

    return {
      intent: "CORRECT_LAST",
      confidence: "LOW",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["koreksi_terakhir"],
      negativeKeywords: [],
      requiresConfirmation: true,
      reason: "Pola koreksi terdeteksi tetapi jumlah berat tidak valid atau tidak terbaca.",
      multipleQuantitiesDetected: false,
    };
  }

  // 6. CLOSED Intent
  if (CLOSED_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "CLOSED",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["libur_tutup"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Konfirmasi bisnis libur / tutup hari ini terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 7. NO_SALE Intent
  if (NO_SALE_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "NO_SALE",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["nihil_penjualan"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Konfirmasi tidak ada penjualan hari ini terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 8. REPORT_TODAY Intent
  if (REPORT_TODAY_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "REPORT_TODAY",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["laporan_hari_ini"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan laporan penjualan harian terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 9. REPORT_WEEK Intent
  if (REPORT_WEEK_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "REPORT_WEEK",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["laporan_minggu_ini"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan laporan penjualan mingguan terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10. REPORT_MONTH Intent
  if (REPORT_MONTH_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "REPORT_MONTH",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["laporan_bulan_ini"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan laporan penjualan bulanan terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 11. Extract Quantities and Match Keywords
  const {
    primaryQuantity,
    allQuantities,
    hasMultipleQuantities,
    hasInvalidNonPositiveQuantity,
  } = extractQuantities(normalizedText);

  const matchedSaleKeywords = SALE_KEYWORDS.filter((kw) => {
    // Exact word or boundary matching to prevent partial word collisions
    const kwRegex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return kwRegex.test(normalizedText);
  });

  const matchedStockKeywords = STOCK_KEYWORDS.filter((kw) => {
    const kwRegex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return kwRegex.test(normalizedText);
  });

  const matchedAmbiguity = AMBIGUITY_KEYWORDS.filter((kw) => {
    const kwRegex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    return kwRegex.test(normalizedText);
  });

  // Guard: Zero or negative quantities cannot become sales
  if (hasInvalidNonPositiveQuantity && !primaryQuantity) {
    return {
      intent: "UNKNOWN",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [...matchedSaleKeywords],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Kuantitas tidak valid (nilai nol atau negatif). Dikecualikan dari penjualan.",
      multipleQuantitiesDetected: false,
    };
  }

  // 12. FALSE-POSITIVE SHIELD: Strict Stock / Inventory keyword veto
  // Messages like "stok tinggal 15kg", "sisa ikan 10kg", "persediaan 50kg" must NEVER be SALE
  if (matchedStockKeywords.length > 0) {
    return {
      intent: "UNKNOWN",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: primaryQuantity?.decimalString ?? null,
      rawQuantity: primaryQuantity?.rawNumber ?? null,
      unit: primaryQuantity?.unit ?? null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [],
      negativeKeywords: [...matchedStockKeywords],
      requiresConfirmation: false,
      reason: `Konteks inventaris/stok terdeteksi (${matchedStockKeywords.join(", ")}). Dikecualikan dari penjualan.`,
      multipleQuantitiesDetected: hasMultipleQuantities,
    };
  }

  // 13. SALE Intent Evaluation
  if (primaryQuantity) {
    // Case 13A: Positive sale keyword found
    if (matchedSaleKeywords.length > 0) {
      if (hasMultipleQuantities) {
        return {
          intent: "SALE",
          confidence: "MEDIUM",
          originalText,
          normalizedText,
          quantity: primaryQuantity.decimalString,
          rawQuantity: primaryQuantity.rawNumber,
          unit: primaryQuantity.unit,
          correctedQuantity: null,
          rawCorrectedQuantity: null,
          matchedKeywords: [...matchedSaleKeywords],
          negativeKeywords: [],
          requiresConfirmation: true,
          reason: `Terdeteksi beberapa kuantitas (${allQuantities.map((q) => `${q.rawNumber} kg`).join(", ")}). Memerlukan konfirmasi pengguna.`,
          multipleQuantitiesDetected: true,
        };
      }

      if (matchedAmbiguity.length > 0) {
        return {
          intent: "SALE",
          confidence: "MEDIUM",
          originalText,
          normalizedText,
          quantity: primaryQuantity.decimalString,
          rawQuantity: primaryQuantity.rawNumber,
          unit: primaryQuantity.unit,
          correctedQuantity: null,
          rawCorrectedQuantity: null,
          matchedKeywords: [...matchedSaleKeywords],
          negativeKeywords: [],
          requiresConfirmation: true,
          reason: `Kata penjualan dengan kata perkiraan (${matchedAmbiguity.join(", ")}). Memerlukan konfirmasi pengguna.`,
          multipleQuantitiesDetected: false,
        };
      }

      // Unambiguous, single quantity sale
      return {
        intent: "SALE",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: primaryQuantity.decimalString,
        rawQuantity: primaryQuantity.rawNumber,
        unit: primaryQuantity.unit,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        matchedKeywords: [...matchedSaleKeywords],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Kata kunci penjualan (${matchedSaleKeywords.join(", ")}) dan kuantitas valid terdeteksi jelas.`,
        multipleQuantitiesDetected: false,
      };
    }

    // Case 13B: Weight alone without positive sale verb (e.g. "15kg", "sekitar 15kg")
    return {
      intent: "SALE",
      confidence: "LOW",
      originalText,
      normalizedText,
      quantity: primaryQuantity.decimalString,
      rawQuantity: primaryQuantity.rawNumber,
      unit: primaryQuantity.unit,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [],
      negativeKeywords: [],
      requiresConfirmation: true,
      reason: "Hanya tertera berat tanpa kata kerja penjualan pasti. Memerlukan konfirmasi pengguna.",
      multipleQuantitiesDetected: hasMultipleQuantities,
    };
  }

  // 14. Sale keyword detected without quantity (e.g. "ada pembeli", "laku tadi")
  if (matchedSaleKeywords.length > 0) {
    return {
      intent: "UNKNOWN",
      confidence: "LOW",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: [...matchedSaleKeywords],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Kata kunci penjualan terdeteksi tanpa berat atau kuantitas yang jelas.",
      multipleQuantitiesDetected: false,
    };
  }

  // 15. Default Fallback: UNKNOWN
  return {
    intent: "UNKNOWN",
    confidence: "HIGH",
    originalText,
    normalizedText,
    quantity: null,
    rawQuantity: null,
    unit: null,
    correctedQuantity: null,
    rawCorrectedQuantity: null,
    matchedKeywords: [],
    negativeKeywords: [],
    requiresConfirmation: false,
    reason: "Pesan tidak dikenali sebagai transaksi atau perintah sistem.",
    multipleQuantitiesDetected: false,
  };
}
