/**
 * Keyword dictionaries and regex patterns for Indonesian business intent detection.
 * Step 3: Pure deterministic matching rules.
 */

/**
 * Positive sale indicators in Indonesian business communications.
 */
export const SALE_KEYWORDS = [
  "kejual",
  "terjual",
  "jual",
  "laku",
  "pembeli",
  "dibeli",
  "ambil",
  "diambil",
  "keluar",
  "menjual",
  "ada pembeli",
  "terjual tadi",
  "tadi laku",
  "laku tadi",
  "orang ambil",
] as const;

/**
 * Inventory / stock keywords that explicitly negate or conflict with SALE intent.
 * Used for strict false-positive prevention (e.g. "stok tinggal 15kg").
 */
export const STOCK_KEYWORDS = [
  "stok",
  "sisa",
  "tersisa",
  "persediaan",
  "masih ada",
  "masih",
  "tinggal",
  "ada stok",
] as const;

/**
 * Words indicating uncertainty or estimated numbers.
 * Lowers confidence and forces requiresConfirmation.
 */
export const AMBIGUITY_KEYWORDS = [
  "sekitar",
  "kayaknya",
  "kira-kira",
  "kira kira",
  "kira2",
  "mungkin",
  "kurang lebih",
  "koleksi",
  "ragu",
] as const;

/**
 * Patterns for daily sales report requests.
 */
export const REPORT_TODAY_PATTERNS: RegExp[] = [
  /\blaporan\s+(?:penjualan\s+)?hari\s+ini\b/,
  /\bomzet\s+(?:penjualan\s+)?hari\s+ini\b/,
  /\bhari\s+ini\s+(?:omzet\s+)?dapat\s+berapa\b/,
  /\bpenjualan\s+hari\s+ini\s+(?:berapa|gimana)\b/,
  /\btotal\s+(?:penjualan\s+)?hari\s+ini\b/,
  /\brekap\s+hari\s+ini\b/,
  /\bhasil\s+hari\s+ini\b/,
];

/**
 * Patterns for weekly sales report requests.
 */
export const REPORT_WEEK_PATTERNS: RegExp[] = [
  /\blaporan\s+(?:penjualan\s+)?minggu\s+ini\b/,
  /\bminggu\s+ini\s+(?:omzet\s+)?dapat\s+berapa\b/,
  /\bomzet\s+(?:penjualan\s+)?minggu\s+ini\b/,
  /\bpenjualan\s+minggu\s+ini\b/,
  /\btotal\s+(?:penjualan\s+)?minggu\s+ini\b/,
  /\brekap\s+minggu\s+ini\b/,
];

/**
 * Patterns for monthly sales report requests.
 */
export const REPORT_MONTH_PATTERNS: RegExp[] = [
  /\blaporan\s+(?:penjualan\s+)?bulan\s+ini\b/,
  /\bbulan\s+ini\s+(?:omzet\s+)?(?:dapat|berapa)\b/,
  /\bbulan\s+ini\s+omzet\s+berapa\b/,
  /\bomzet\s+(?:penjualan\s+)?bulan\s+ini\b/,
  /\bpenjualan\s+bulan\s+ini\b/,
  /\btotal\s+(?:penjualan\s+)?bulan\s+ini\b/,
  /\brekap\s+bulan\s+ini\b/,
];

/**
 * Patterns explicitly confirming no sales occurred during business hours.
 */
export const NO_SALE_PATTERNS: RegExp[] = [
  /\bgak\s+ada\s+penjualan(?:\s+hari\s+ini)?\b/,
  /\btidak\s+ada\s+penjualan(?:\s+hari\s+ini)?\b/,
  /\bhari\s+ini\s+gak\s+laku\b/,
  /\bhari\s+ini\s+tidak\s+ada\s+yang\s+beli\b/,
  /\bgak\s+ada\s+yang\s+beli(?:\s+hari\s+ini)?\b/,
  /\bkosong\s+hari\s+ini\b/,
  /\bhari\s+ini\s+kosong\b/,
  /\bbelum\s+ada\s+penjualan\b/,
  /\bbelum\s+laku(?:\s+hari\s+ini)?\b/,
];

/**
 * Patterns confirming business closure / day off / holiday.
 */
export const CLOSED_PATTERNS: RegExp[] = [
  /\blibur\s+hari\s+ini\b/,
  /\bhari\s+ini\s+libur\b/,
  /\bhari\s+ini\s+tutup\b/,
  /\btutup\s+hari\s+ini\b/,
  /\bgak\s+jualan\s+hari\s+ini\b/,
  /\bhari\s+ini\s+tidak\s+buka\b/,
  /\bhari\s+ini\s+gak\s+buka\b/,
  /\blagi\s+libur\b/,
  /\btoko\s+tutup\b/,
];

/**
 * Patterns requesting cancellation of the most recent transaction.
 */
export const CANCEL_LAST_PATTERNS: RegExp[] = [
  /\bbatal\s+terakhir\b/,
  /\bbatal\s+yang\s+terakhir\b/,
  /\bbatalkan\s+transaksi\s+terakhir\b/,
  /\bhapus\s+transaksi\s+terakhir\b/,
  /\byang\s+terakhir\s+salah\s+batal\b/,
  /\bbatal\s+transaksi\s+terakhir\b/,
  /\btransaksi\s+terakhir\s+batal\b/,
];

/**
 * Patterns requesting correction of the most recent transaction's quantity.
 */
export const CORRECT_LAST_PATTERNS: RegExp[] = [
  /\bubah\s+terakhir\s+jadi\b/,
  /\byang\s+terakhir\s+harusnya\b/,
  /\bkoreksi\s+terakhir\s+jadi\b/,
  /\bganti\s+terakhir\s+jadi\b/,
  /\bkoreksi\s+terakhir\b/,
  /\bubah\s+terakhir\b/,
];

/**
 * Patterns requesting help, usage guide, or list of commands.
 */
export const HELP_PATTERNS: RegExp[] = [
  /^(?:help|bantuan|tolong|menu|panduan|info)$/,
  /\bcara\s+pakai\b/,
  /\bbisa\s+apa\b/,
  /\bcara\s+menggunakan\b/,
  /\bcontoh\s+pesan\b/,
  /\bpetunjuk\s+penggunaan\b/,
];

/**
 * Patterns for cash & bank balance inquiries.
 */
export const CASH_PATTERNS: RegExp[] = [
  /\b(?:saldo\s+(?:kas|bank|uang)|cek\s+saldo|uang\s+kas|kas\s+dan\s+bank|kas\s+sekarang)\b/,
  /^saldo$/,
  /^kas$/,
];

/**
 * Patterns for Profit & Loss (Laba Rugi) inquiries.
 */
export const PROFIT_PATTERNS: RegExp[] = [
  /\b(?:laba\s+rugi|laba\s+(?:bulan|hari|minggu|bersih|kotor)|untung\s+(?:bulan|hari|minggu|bersih))\b/,
  /^laba$/,
  /^untung$/,
];

/**
 * Patterns for Balance Sheet (Neraca) inquiries.
 */
export const BALANCE_SHEET_PATTERNS: RegExp[] = [
  /\b(?:neraca(?:\s+keuangan|\s+bulan\s+ini|\s+hari\s+ini)?)\b/,
];

/**
 * Patterns for Cash Flow (Arus Kas) inquiries.
 */
export const CASH_FLOW_PATTERNS: RegExp[] = [
  /\b(?:arus\s+kas(?:\s+bulan\s+ini)?|cash\s+flow)\b/,
];

/**
 * Patterns for Trial Balance (Neraca Saldo) inquiries.
 */
export const TRIAL_BALANCE_PATTERNS: RegExp[] = [
  /\b(?:neraca\s+saldo(?:\s+bulan\s+ini)?)\b/,
];

/**
 * Patterns for General Ledger (Buku Besar) inquiries.
 */
export const GENERAL_LEDGER_PATTERNS: RegExp[] = [
  /\b(?:buku\s+besar(?:\s+kas|\s+bank)?)\b/,
];

/**
 * Patterns for Excel export requests.
 */
export const EXPORT_REPORT_PATTERNS: RegExp[] = [
  /\b(?:export\s+(?:laporan|excel|transaksi)|ekspor\s+(?:laporan|excel)|download\s+(?:laporan|excel))\b/,
  /^export$/,
];

/**
 * Patterns for Capital (Modal Masuk).
 */
export const CAPITAL_PATTERNS: RegExp[] = [
  /\b(?:modal\s+masuk|tambah\s+modal|setor\s+modal)\b/,
];

/**
 * Patterns for Owner Draw (Prive).
 */
export const OWNER_DRAW_PATTERNS: RegExp[] = [
  /\b(?:ambil\s+(?:uang\s+usaha|kas|prive|uang)|tarik\s+(?:uang\s+usaha|uang|kas)|prive|tarik\s+pribadi|ambil\s+pribadi)\b/,
  /\b(?:ambil|tarik)\b.*\b(?:pribadi|prive)\b/,
];

/**
 * Patterns for Purchases (Beli stok).
 */
export const PURCHASE_PATTERNS: RegExp[] = [
  /\b(?:beli\s+stok|beli\s+bibit|beli\s+pakan|kulakan|beli\s+barang)\b/,
];

/**
 * Common expense category identifiers in Indonesian.
 */
export const EXPENSE_CATEGORIES = [
  "listrik", "pln", "air", "pdam", "gaji", "upah", "karyawan",
  "sewa", "transport", "bensin", "solar", "bbm", "ongkir",
  "atk", "administrasi", "tulis", "marketing", "iklan", "promo",
  "pulsa", "paket data", "wifi", "internet", "makan", "konsumsi"
] as const;
