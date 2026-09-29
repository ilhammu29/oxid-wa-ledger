/**
 * OXID WA Ledger - Comprehensive Message Parser & Conversation Test Suite
 * Step 3: Automated verification of deterministic Indonesian parser.
 */

import {
  parseMessage,
  handleConversationMessage,
} from "../src/modules/parser";

interface TestCase {
  name: string;
  category: string;
  input: string;
  expectedIntent: string;
  expectedConfidence?: "HIGH" | "MEDIUM" | "LOW";
  expectedQuantity?: string | null;
  expectedCorrectedQuantity?: string | null;
  expectedRequiresConfirmation?: boolean;
  expectedAction?: string;
}

const testCases: TestCase[] = [
  // 1. SALE Tests (Unambiguous)
  {
    name: "Standard sale with 'kejual' and kg",
    category: "SALE",
    input: "kejual 30kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "30.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with 'ada pembeli' and kg",
    category: "SALE",
    input: "ada pembeli 15kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "15.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with space between number and kg",
    category: "SALE",
    input: "jual 20 kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "20.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with 'keluar' and 'kilogram'",
    category: "SALE",
    input: "keluar 7 kilogram",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "7.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with underscore and 'kilo'",
    category: "SALE",
    input: "terjual 12_kilo",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "12.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with uppercase and 'hari ini laku'",
    category: "SALE",
    input: "hari ini laku 8 KG",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "8.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with Indonesian decimal comma (2,5kg)",
    category: "SALE",
    input: "jual 2,5kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "2.500",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Sale with large decimal weight (150.25 kilogram)",
    category: "SALE",
    input: "ada pembeli 150.25 kilogram",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "150.250",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Colloquial sale 'Tadi laku 2,5 kilo'",
    category: "SALE",
    input: "Tadi laku 2,5 kilo",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "2.500",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Colloquial sale 'orang ambil 7 kilogram'",
    category: "SALE",
    input: "orang ambil 7 kilogram",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "7.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Triple-digit integer weight 'jual 100 KG'",
    category: "SALE",
    input: "jual 100 KG",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "100.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },

  // 2. FALSE POSITIVE SHIELD (Stock / Inventory Protection)
  {
    name: "Stock remaining with 'tinggal' must not become sale",
    category: "FALSE_POSITIVE",
    input: "stok tinggal 15kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Stock remaining with 'masih' must not become sale",
    category: "FALSE_POSITIVE",
    input: "stok masih 20 kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Stock statement 'sisa ikan 10kg' must not become sale",
    category: "FALSE_POSITIVE",
    input: "sisa ikan 10kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Stock statement 'persediaan 50kg' must not become sale",
    category: "FALSE_POSITIVE",
    input: "persediaan 50kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Stock statement 'ada stok 10kg' must not become sale",
    category: "FALSE_POSITIVE",
    input: "ada stok 10kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Stock statement 'ikan masih 15kg' must not become sale",
    category: "FALSE_POSITIVE",
    input: "ikan masih 15kg",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Sale and stock keyword collision chooses conservative non-sale",
    category: "FALSE_POSITIVE",
    input: "kejual 10kg tapi stok masih ada",
    expectedIntent: "UNKNOWN",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_UNKNOWN_HELP",
  },

  // 3. AMBIGUOUS / CONFIRMATION REQUIRED
  {
    name: "Bare weight '15kg' requires confirmation",
    category: "AMBIGUOUS",
    input: "15kg",
    expectedIntent: "SALE",
    expectedConfidence: "LOW",
    expectedQuantity: "15.000",
    expectedRequiresConfirmation: true,
    expectedAction: "ASK_CONFIRMATION",
  },
  {
    name: "Uncertain weight 'sekitar 15kg' requires confirmation",
    category: "AMBIGUOUS",
    input: "sekitar 15kg",
    expectedIntent: "SALE",
    expectedConfidence: "LOW",
    expectedQuantity: "15.000",
    expectedRequiresConfirmation: true,
    expectedAction: "ASK_CONFIRMATION",
  },
  {
    name: "Uncertain weight 'kayaknya 10kg' requires confirmation",
    category: "AMBIGUOUS",
    input: "kayaknya 10kg",
    expectedIntent: "SALE",
    expectedConfidence: "LOW",
    expectedQuantity: "10.000",
    expectedRequiresConfirmation: true,
    expectedAction: "ASK_CONFIRMATION",
  },
  {
    name: "Sale with uncertainty word 'kayaknya laku 10kg' requires confirmation",
    category: "AMBIGUOUS",
    input: "kayaknya laku 10kg",
    expectedIntent: "SALE",
    expectedConfidence: "MEDIUM",
    expectedQuantity: "10.000",
    expectedRequiresConfirmation: true,
    expectedAction: "ASK_CONFIRMATION",
  },

  // 4. REPORT INTENTS
  {
    name: "Report daily 'laporan hari ini'",
    category: "REPORT",
    input: "laporan hari ini",
    expectedIntent: "REPORT_TODAY",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_TODAY",
  },
  {
    name: "Report daily 'omzet hari ini'",
    category: "REPORT",
    input: "omzet hari ini",
    expectedIntent: "REPORT_TODAY",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_TODAY",
  },
  {
    name: "Report daily 'hari ini dapat berapa'",
    category: "REPORT",
    input: "hari ini dapat berapa",
    expectedIntent: "REPORT_TODAY",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_TODAY",
  },
  {
    name: "Report daily 'penjualan hari ini berapa'",
    category: "REPORT",
    input: "penjualan hari ini berapa",
    expectedIntent: "REPORT_TODAY",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_TODAY",
  },
  {
    name: "Report weekly 'laporan minggu ini'",
    category: "REPORT",
    input: "laporan minggu ini",
    expectedIntent: "REPORT_WEEK",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_WEEK",
  },
  {
    name: "Report weekly 'minggu ini dapat berapa?'",
    category: "REPORT",
    input: "minggu ini dapat berapa?",
    expectedIntent: "REPORT_WEEK",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_WEEK",
  },
  {
    name: "Report monthly 'laporan bulan ini'",
    category: "REPORT",
    input: "laporan bulan ini",
    expectedIntent: "REPORT_MONTH",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_MONTH",
  },
  {
    name: "Report monthly 'bulan ini omzet berapa?'",
    category: "REPORT",
    input: "bulan ini omzet berapa?",
    expectedIntent: "REPORT_MONTH",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_REPORT_MONTH",
  },

  // 5. NO SALE INTENT
  {
    name: "Explicit no sale 'gak ada penjualan hari ini'",
    category: "NO_SALE",
    input: "gak ada penjualan hari ini",
    expectedIntent: "NO_SALE",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_NO_SALE",
  },
  {
    name: "Explicit no sale 'tidak ada penjualan'",
    category: "NO_SALE",
    input: "tidak ada penjualan",
    expectedIntent: "NO_SALE",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_NO_SALE",
  },
  {
    name: "Explicit no sale 'hari ini gak laku'",
    category: "NO_SALE",
    input: "hari ini gak laku",
    expectedIntent: "NO_SALE",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_NO_SALE",
  },
  {
    name: "Explicit no sale 'hari ini tidak ada yang beli'",
    category: "NO_SALE",
    input: "hari ini tidak ada yang beli",
    expectedIntent: "NO_SALE",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_NO_SALE",
  },
  {
    name: "Explicit no sale 'kosong hari ini'",
    category: "NO_SALE",
    input: "kosong hari ini",
    expectedIntent: "NO_SALE",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_NO_SALE",
  },

  // 6. CLOSED INTENT
  {
    name: "Business closed 'libur hari ini'",
    category: "CLOSED",
    input: "libur hari ini",
    expectedIntent: "CLOSED",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_CLOSED",
  },
  {
    name: "Business closed 'hari ini tutup'",
    category: "CLOSED",
    input: "hari ini tutup",
    expectedIntent: "CLOSED",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_CLOSED",
  },
  {
    name: "Business closed 'gak jualan hari ini'",
    category: "CLOSED",
    input: "gak jualan hari ini",
    expectedIntent: "CLOSED",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_CLOSED",
  },
  {
    name: "Business closed 'hari ini tidak buka'",
    category: "CLOSED",
    input: "hari ini tidak buka",
    expectedIntent: "CLOSED",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "MARK_CLOSED",
  },

  // 7. CANCEL LAST INTENT
  {
    name: "Cancel last 'batal terakhir'",
    category: "CANCEL_LAST",
    input: "batal terakhir",
    expectedIntent: "CANCEL_LAST",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CANCEL_LAST",
  },
  {
    name: "Cancel last 'batalkan yang terakhir'",
    category: "CANCEL_LAST",
    input: "batalkan yang terakhir",
    expectedIntent: "CANCEL_LAST",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CANCEL_LAST",
  },
  {
    name: "Cancel last 'hapus transaksi terakhir'",
    category: "CANCEL_LAST",
    input: "hapus transaksi terakhir",
    expectedIntent: "CANCEL_LAST",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CANCEL_LAST",
  },
  {
    name: "Cancel last 'yang terakhir salah, batal'",
    category: "CANCEL_LAST",
    input: "yang terakhir salah, batal",
    expectedIntent: "CANCEL_LAST",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CANCEL_LAST",
  },

  // 8. CORRECT LAST INTENT
  {
    name: "Correction 'ubah terakhir jadi 20kg'",
    category: "CORRECT_LAST",
    input: "ubah terakhir jadi 20kg",
    expectedIntent: "CORRECT_LAST",
    expectedConfidence: "HIGH",
    expectedCorrectedQuantity: "20.000",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CORRECT_LAST",
  },
  {
    name: "Correction 'yang terakhir harusnya 25kg'",
    category: "CORRECT_LAST",
    input: "yang terakhir harusnya 25kg",
    expectedIntent: "CORRECT_LAST",
    expectedConfidence: "HIGH",
    expectedCorrectedQuantity: "25.000",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CORRECT_LAST",
  },
  {
    name: "Correction with decimal 'koreksi terakhir jadi 2,5kg'",
    category: "CORRECT_LAST",
    input: "koreksi terakhir jadi 2,5kg",
    expectedIntent: "CORRECT_LAST",
    expectedConfidence: "HIGH",
    expectedCorrectedQuantity: "2.500",
    expectedRequiresConfirmation: false,
    expectedAction: "REQUEST_CORRECT_LAST",
  },

  // 9. HELP INTENT
  {
    name: "Help command 'help'",
    category: "HELP",
    input: "help",
    expectedIntent: "HELP",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_HELP",
  },
  {
    name: "Help command 'bantuan'",
    category: "HELP",
    input: "bantuan",
    expectedIntent: "HELP",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_HELP",
  },
  {
    name: "Help query 'cara pakai'",
    category: "HELP",
    input: "cara pakai",
    expectedIntent: "HELP",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_HELP",
  },
  {
    name: "Help query 'bisa apa'",
    category: "HELP",
    input: "bisa apa",
    expectedIntent: "HELP",
    expectedConfidence: "HIGH",
    expectedRequiresConfirmation: false,
    expectedAction: "SHOW_HELP",
  },

  // 10. UNKNOWN INTENT
  {
    name: "Random gibberish 'asdf'",
    category: "UNKNOWN",
    input: "asdf",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Standard greeting 'halo'",
    category: "UNKNOWN",
    input: "halo",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Unrelated message 'ikan bagus'",
    category: "UNKNOWN",
    input: "ikan bagus",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Empty string safely handled",
    category: "UNKNOWN",
    input: "",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Whitespace string safely handled",
    category: "UNKNOWN",
    input: "     ",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },

  // 11. EDGE CASES
  {
    name: "Zero quantity rejected from becoming sale",
    category: "EDGE_CASE",
    input: "jual 0kg",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Negative quantity rejected from becoming sale",
    category: "EDGE_CASE",
    input: "jual -5kg",
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
  {
    name: "Multiple quantities 'jual 10kg lalu 5kg' triggers confirmation",
    category: "EDGE_CASE",
    input: "jual 10kg lalu 5kg",
    expectedIntent: "SALE",
    expectedConfidence: "MEDIUM",
    expectedRequiresConfirmation: true,
    expectedAction: "ASK_CONFIRMATION",
  },
  {
    name: "Hyphenated unit with space 'jual 15-kg'",
    category: "EDGE_CASE",
    input: "jual 15-kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "15.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Excessive whitespace and uppercase '  KEJUAL    30  KG   '",
    category: "EDGE_CASE",
    input: "  KEJUAL    30  KG   ",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "30.000",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "3-digit unambiguous decimal 'jual 2.750kg'",
    category: "EDGE_CASE",
    input: "jual 2.750kg",
    expectedIntent: "SALE",
    expectedConfidence: "HIGH",
    expectedQuantity: "2.750",
    expectedRequiresConfirmation: false,
    expectedAction: "CREATE_SALE",
  },
  {
    name: "Input exceeding 500 characters safely bounded to UNKNOWN",
    category: "SECURITY",
    input: "a".repeat(505),
    expectedIntent: "UNKNOWN",
    expectedAction: "SHOW_UNKNOWN_HELP",
  },
];

async function runParserTests() {
  console.log("=== OXID WA Ledger - Step 3 Parser & Conversation Engine Test Suite ===\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const actionResult = handleConversationMessage(tc.input);
    const parsed = actionResult.parsed;

    const intentMatches = parsed.intent === tc.expectedIntent;
    const confidenceMatches = tc.expectedConfidence
      ? parsed.confidence === tc.expectedConfidence
      : true;
    const quantityMatches = tc.expectedQuantity !== undefined
      ? parsed.quantity === tc.expectedQuantity
      : true;
    const correctedMatches = tc.expectedCorrectedQuantity !== undefined
      ? parsed.correctedQuantity === tc.expectedCorrectedQuantity
      : true;
    const confirmationMatches = tc.expectedRequiresConfirmation !== undefined
      ? parsed.requiresConfirmation === tc.expectedRequiresConfirmation
      : true;
    const actionMatches = tc.expectedAction
      ? actionResult.action === tc.expectedAction
      : true;

    const testPassed =
      intentMatches &&
      confidenceMatches &&
      quantityMatches &&
      correctedMatches &&
      confirmationMatches &&
      actionMatches;

    if (testPassed) {
      passed++;
      console.log(`  ✓ [${tc.category}] ${tc.name}`);
    } else {
      failed++;
      console.error(`  ✗ [${tc.category}] ${tc.name}`);
      console.error(`    Input: "${tc.input}"`);
      if (!intentMatches) console.error(`    Expected Intent: ${tc.expectedIntent}, Got: ${parsed.intent}`);
      if (!confidenceMatches) console.error(`    Expected Confidence: ${tc.expectedConfidence}, Got: ${parsed.confidence}`);
      if (!quantityMatches) console.error(`    Expected Quantity: ${tc.expectedQuantity}, Got: ${parsed.quantity}`);
      if (!correctedMatches) console.error(`    Expected Corrected: ${tc.expectedCorrectedQuantity}, Got: ${parsed.correctedQuantity}`);
      if (!confirmationMatches) console.error(`    Expected RequiresConfirmation: ${tc.expectedRequiresConfirmation}, Got: ${parsed.requiresConfirmation}`);
      if (!actionMatches) console.error(`    Expected Action: ${tc.expectedAction}, Got: ${actionResult.action}`);
    }
  }

  console.log("\n=== Test Results Summary ===");
  console.log(`Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runParserTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
