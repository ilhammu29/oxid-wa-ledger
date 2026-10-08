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
  CASH_PATTERNS,
  PROFIT_PATTERNS,
  BALANCE_SHEET_PATTERNS,
  CASH_FLOW_PATTERNS,
  TRIAL_BALANCE_PATTERNS,
  GENERAL_LEDGER_PATTERNS,
  EXPORT_REPORT_PATTERNS,
  INVENTORY_PATTERNS,
  RECEIVABLE_STATUS_PATTERNS,
  PAYABLE_STATUS_PATTERNS,
  CAPITAL_PATTERNS,
  OWNER_DRAW_PATTERNS,
  PURCHASE_PATTERNS,
  EXPENSE_CATEGORIES,
} from "./keywords";
import { extractMoneyAmount } from "./money";

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

  // 7.5 EXPORT_REPORT Intent (Placed before sales report patterns)
  if (EXPORT_REPORT_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "EXPORT_REPORT",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["export_report"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan ekspor laporan pembukuan Excel terdeteksi.",
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

  // 10.2 CASH_BALANCE Intent
  if (CASH_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "CASH_BALANCE",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["saldo_kas"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan informasi saldo kas & bank terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.3 TRIAL_BALANCE Intent (Placed before general balance sheet)
  if (TRIAL_BALANCE_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "TRIAL_BALANCE",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["neraca_saldo"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan neraca saldo terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.4 BALANCE_SHEET Intent
  if (BALANCE_SHEET_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "BALANCE_SHEET",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["neraca"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan neraca keuangan terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.5 CASH_FLOW Intent
  if (CASH_FLOW_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "CASH_FLOW",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["arus_kas"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan laporan arus kas terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.6 GENERAL_LEDGER Intent
  if (GENERAL_LEDGER_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "GENERAL_LEDGER",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["buku_besar"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan buku besar terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.7 PROFIT_LOSS Intent
  if (PROFIT_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "PROFIT_LOSS",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["laba_rugi"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan laporan laba rugi terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.75 INVENTORY_STATUS Intent
  if (INVENTORY_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "INVENTORY_STATUS",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["stok"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan status stok persediaan terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.76 RECEIVABLE_STATUS Intent
  if (RECEIVABLE_STATUS_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "RECEIVABLE_STATUS",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["piutang"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan status piutang usaha terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.77 PAYABLE_STATUS Intent
  if (PAYABLE_STATUS_PATTERNS.some((p) => p.test(normalizedText))) {
    return {
      intent: "PAYABLE_STATUS",
      confidence: "HIGH",
      originalText,
      normalizedText,
      quantity: null,
      rawQuantity: null,
      unit: null,
      correctedQuantity: null,
      rawCorrectedQuantity: null,
      matchedKeywords: ["hutang"],
      negativeKeywords: [],
      requiresConfirmation: false,
      reason: "Permintaan status hutang usaha terdeteksi.",
      multipleQuantitiesDetected: false,
    };
  }

  // 10.8 CAPITAL_IN Intent
  if (CAPITAL_PATTERNS.some((p) => p.test(normalizedText))) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "CAPITAL_IN",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["modal_masuk"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pencatatan setoran modal Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  // 10.9 OWNER_DRAW Intent
  if (OWNER_DRAW_PATTERNS.some((p) => p.test(normalizedText))) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "OWNER_DRAW",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["prive"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pencatatan prive pemilik Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  // 10.10 PURCHASE Intent
  if (PURCHASE_PATTERNS.some((p) => p.test(normalizedText))) {
    const money = extractMoneyAmount(normalizedText);
    const { primaryQuantity: pQty } = extractQuantities(normalizedText);
    if (money) {
      return {
        intent: "PURCHASE",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: pQty?.decimalString || null,
        rawQuantity: pQty?.rawNumber || null,
        unit: pQty?.unit || "kg",
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["beli_stok"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pencatatan pembelian stok Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  // 10.11 PAY_RECEIVABLE / PAY_PAYABLE
  const recvMatch = normalizedText.match(/\b([a-z0-9_-]+)\s+bayar\s+(?:piutang|hutang)\b/i) ||
                    normalizedText.match(/\bpelunasan\s+(?:piutang\s+)?([a-z0-9_-]+)\b/i) ||
                    normalizedText.match(/\bbayar\s+piutang\b/i) ||
                    normalizedText.match(/\bterima\s+pembayaran\s+piutang\b/i);
  if (recvMatch) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      const customerName = recvMatch[1] && recvMatch[1] !== "terima" ? recvMatch[1] : null;
      return {
        intent: "PAY_RECEIVABLE",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        counterpartyName: customerName,
        matchedKeywords: ["bayar_hutang_pelanggan"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pembayaran piutang ${customerName ? `dari ${customerName} ` : ""}sebesar Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  const paybMatch = normalizedText.match(/\bbayar\s+hutang\s+(?:supplier|pakan|toko|ke\s+([a-z0-9_-]+)|([a-z0-9_-]+))\b/i) ||
                    normalizedText.match(/^bayar\s+hutang\b/i);
  if (paybMatch) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "PAY_PAYABLE",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["bayar_hutang_supplier"],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pembayaran hutang usaha sebesar Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  // 10.12 EXPENSE Intent (Evaluated before generic ambiguous payment)
  const matchedCategory = EXPENSE_CATEGORIES.find((cat) => {
    const catRegex = new RegExp(`\\b${cat}\\b`, "i");
    return catRegex.test(normalizedText);
  });

  if (matchedCategory) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "EXPENSE",
        confidence: "HIGH",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        category: matchedCategory,
        matchedKeywords: [matchedCategory],
        negativeKeywords: [],
        requiresConfirmation: false,
        reason: `Pengeluaran ${matchedCategory} sebesar Rp ${money.amount.toLocaleString()} terdeteksi.`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  // 10.13 Ambiguity Handling: "bayar 500 ribu" or "masuk 5 juta"
  if (/^bayar\s+/i.test(normalizedText)) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "AMBIGUOUS_FINANCIAL",
        confidence: "LOW",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["bayar_ambigu"],
        negativeKeywords: [],
        requiresConfirmation: true,
        reason: `Pembayaran Rp ${money.amount.toLocaleString()} terdeteksi tanpa keterangan jelas (pengeluaran atau pelunasan hutang).`,
        multipleQuantitiesDetected: false,
      };
    }
  }

  if (/^masuk\s+/i.test(normalizedText) || /^uang\s+masuk\s+/i.test(normalizedText)) {
    const money = extractMoneyAmount(normalizedText);
    if (money) {
      return {
        intent: "AMBIGUOUS_FINANCIAL",
        confidence: "LOW",
        originalText,
        normalizedText,
        quantity: null,
        rawQuantity: null,
        unit: null,
        correctedQuantity: null,
        rawCorrectedQuantity: null,
        moneyAmount: money.amount,
        matchedKeywords: ["masuk_ambigu"],
        negativeKeywords: [],
        requiresConfirmation: true,
        reason: `Uang masuk Rp ${money.amount.toLocaleString()} terdeteksi tanpa keterangan jelas (penjualan, modal, atau piutang).`,
        multipleQuantitiesDetected: false,
      };
    }
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
