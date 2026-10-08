import { parseMessage, evaluateConversationAction } from "../src/modules/parser";

interface TestCase {
  name: string;
  input: string;
  expectedIntent: string;
  expectedAction: string;
}

const testCases: TestCase[] = [
  // Slash commands shortcuts
  {
    name: "Slash command /saldo",
    input: "/saldo",
    expectedIntent: "CASH_BALANCE",
    expectedAction: "SHOW_CASH_BALANCE",
  },
  {
    name: "Slash command /laba",
    input: "/laba",
    expectedIntent: "PROFIT_LOSS",
    expectedAction: "SHOW_PROFIT_LOSS",
  },
  {
    name: "Slash command /neraca",
    input: "/neraca",
    expectedIntent: "BALANCE_SHEET",
    expectedAction: "SHOW_BALANCE_SHEET",
  },
  {
    name: "Slash command /stok",
    input: "/stok",
    expectedIntent: "INVENTORY_STATUS",
    expectedAction: "SHOW_INVENTORY_STATUS",
  },
  {
    name: "Slash command /piutang",
    input: "/piutang",
    expectedIntent: "RECEIVABLE_STATUS",
    expectedAction: "SHOW_RECEIVABLE_STATUS",
  },
  {
    name: "Slash command /hutang",
    input: "/hutang",
    expectedIntent: "PAYABLE_STATUS",
    expectedAction: "SHOW_PAYABLE_STATUS",
  },
  {
    name: "Slash command /export",
    input: "/export",
    expectedIntent: "EXPORT_REPORT",
    expectedAction: "EXECUTE_EXPORT_REPORT",
  },
  {
    name: "Slash command /help",
    input: "/help",
    expectedIntent: "HELP",
    expectedAction: "SHOW_HELP",
  },

  // Natural language status queries
  {
    name: "Cek saldo kas sekarang",
    input: "saldo kas sekarang",
    expectedIntent: "CASH_BALANCE",
    expectedAction: "SHOW_CASH_BALANCE",
  },
  {
    name: "Cek stok persediaan sekarang",
    input: "stok sekarang",
    expectedIntent: "INVENTORY_STATUS",
    expectedAction: "SHOW_INVENTORY_STATUS",
  },
  {
    name: "Cek stok barang",
    input: "cek stok",
    expectedIntent: "INVENTORY_STATUS",
    expectedAction: "SHOW_INVENTORY_STATUS",
  },
  {
    name: "Cek daftar piutang pelanggan",
    input: "daftar piutang",
    expectedIntent: "RECEIVABLE_STATUS",
    expectedAction: "SHOW_RECEIVABLE_STATUS",
  },
  {
    name: "Cek tagihan pelanggan",
    input: "tagihan pelanggan",
    expectedIntent: "RECEIVABLE_STATUS",
    expectedAction: "SHOW_RECEIVABLE_STATUS",
  },
  {
    name: "Cek daftar hutang",
    input: "daftar hutang",
    expectedIntent: "PAYABLE_STATUS",
    expectedAction: "SHOW_PAYABLE_STATUS",
  },
  {
    name: "Cek kewajiban supplier",
    input: "kewajiban supplier",
    expectedIntent: "PAYABLE_STATUS",
    expectedAction: "SHOW_PAYABLE_STATUS",
  },
  {
    name: "Laporan laba rugi bulan ini",
    input: "laba rugi bulan ini",
    expectedIntent: "PROFIT_LOSS",
    expectedAction: "SHOW_PROFIT_LOSS",
  },
  {
    name: "Laporan arus kas",
    input: "arus kas",
    expectedIntent: "CASH_FLOW",
    expectedAction: "SHOW_CASH_FLOW",
  },
  {
    name: "Laporan neraca saldo",
    input: "neraca saldo",
    expectedIntent: "TRIAL_BALANCE",
    expectedAction: "SHOW_TRIAL_BALANCE",
  },
  {
    name: "Buku besar",
    input: "buku besar",
    expectedIntent: "GENERAL_LEDGER",
    expectedAction: "SHOW_GENERAL_LEDGER",
  },
  {
    name: "Ekspor excel",
    input: "ekspor excel",
    expectedIntent: "EXPORT_REPORT",
    expectedAction: "EXECUTE_EXPORT_REPORT",
  },

  // Operational Accounting Writes
  {
    name: "Beban listrik operasional",
    input: "Listrik 150rb",
    expectedIntent: "EXPENSE",
    expectedAction: "RECORD_EXPENSE",
  },
  {
    name: "Beban bensin motor",
    input: "Bensin 50rb",
    expectedIntent: "EXPENSE",
    expectedAction: "RECORD_EXPENSE",
  },
  {
    name: "Pembelian stok lele",
    input: "Beli stok lele 100kg 2jt",
    expectedIntent: "PURCHASE",
    expectedAction: "RECORD_PURCHASE",
  },
  {
    name: "Setoran modal masuk",
    input: "Modal masuk 5jt",
    expectedIntent: "CAPITAL_IN",
    expectedAction: "RECORD_CAPITAL_IN",
  },
  {
    name: "Penarikan prive pemilik",
    input: "Prive 500rb",
    expectedIntent: "OWNER_DRAW",
    expectedAction: "RECORD_OWNER_DRAW",
  },
  {
    name: "Pelunasan piutang pelanggan",
    input: "Budi bayar piutang 500rb",
    expectedIntent: "PAY_RECEIVABLE",
    expectedAction: "RECORD_PAY_RECEIVABLE",
  },
  {
    name: "Pembayaran hutang supplier",
    input: "Bayar hutang supplier 1jt",
    expectedIntent: "PAY_PAYABLE",
    expectedAction: "RECORD_PAY_PAYABLE",
  },
];

console.log("=== Testing Telegram Parity & Command Coverage ===");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const parsed = parseMessage(tc.input);
  const evaluated = evaluateConversationAction(parsed);

  const intentOk = parsed.intent === tc.expectedIntent;
  const actionOk = evaluated.action === tc.expectedAction;

  if (intentOk && actionOk) {
    passed++;
    console.log(`  ✓ [PASS] ${tc.name} ("${tc.input}") -> ${parsed.intent} | ${evaluated.action}`);
  } else {
    failed++;
    console.error(`  ✗ [FAIL] ${tc.name} ("${tc.input}")`);
    console.error(`     Expected: ${tc.expectedIntent} | ${tc.expectedAction}`);
    console.error(`     Actual:   ${parsed.intent} | ${evaluated.action}`);
  }
}

console.log(`\n=== Parity Summary ===`);
console.log(`Total: ${testCases.length} | Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Telegram parity test cases passed!");
}
