/**
 * Formats ledger data from Supabase into 2D value arrays for Google Sheets.
 * Implements strict formula injection protection and standard warning banners.
 */

export const SHEET_BANNER_ROW_1 = "Data dibuat otomatis oleh OXID Ledger.";
export const SHEET_BANNER_ROW_2 =
  "Supabase/PostgreSQL adalah sumber utama data. Perubahan manual pada lembar ini tidak mengubah database dan dapat ditimpa saat sinkronisasi berikutnya.";

export type SheetCellValue = string | number | boolean | null;
export type SheetMatrix = SheetCellValue[][];

/**
 * Defensive formula injection guard:
 * While valueInputOption=RAW already prevents Google Sheets from executing formulas,
 * prepending a tick mark (') to dangerous formula starters (=, +, -, @, \t, \r)
 * provides secondary defense in depth across CSV downloads or copy-paste.
 */
export function sanitizeCellValue(val: unknown): SheetCellValue {
  if (val === null || val === undefined) {
    return "";
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return val;
  }
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export interface BusinessMetadata {
  id: string;
  name: string;
  timezone: string;
}

export interface KpiData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayTransactionCount: number;
  todayQuantity: number;
}

export interface DailySeriesItem {
  date: string;
  revenue: number;
  transactionCount: number;
}

export function formatDashboardSheet(
  business: BusinessMetadata,
  kpis: KpiData,
  dailySeries: DailySeriesItem[],
  syncTimestamp: Date = new Date()
): SheetMatrix {
  const syncFormatted = syncTimestamp.toLocaleString("id-ID", {
    timeZone: business.timezone || "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  const rows: SheetMatrix = [
    [SHEET_BANNER_ROW_1],
    [SHEET_BANNER_ROW_2],
    [],
    ["Nama Bisnis:", sanitizeCellValue(business.name), "", "Zona Waktu:", business.timezone || "Asia/Jakarta"],
    ["Terakhir Disinkronkan:", syncFormatted, "", "Mata Uang:", "IDR"],
    [],
    ["METRIK KPI", "NILAI"],
    ["Omzet Hari Ini", kpis.todayRevenue],
    ["Omzet Minggu Ini", kpis.weekRevenue],
    ["Omzet Bulan Ini", kpis.monthRevenue],
    ["Jumlah Transaksi Hari Ini", kpis.todayTransactionCount],
    ["Total Qty Terjual Hari Ini", kpis.todayQuantity],
    [],
    ["TANGGAL", "OMZET (IDR)", "JUMLAH TRANSAKSI"],
  ];

  for (const item of dailySeries) {
    rows.push([item.date, item.revenue, item.transactionCount]);
  }

  return rows;
}

export interface TransactionRowData {
  id: string;
  transactionDate: string;
  transactionTime: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  source: string;
  status: string;
  originalMessage?: string | null;
}

export function formatTransactionsSheet(
  transactions: TransactionRowData[]
): SheetMatrix {
  const rows: SheetMatrix = [
    [SHEET_BANNER_ROW_1],
    [SHEET_BANNER_ROW_2],
    [],
    [
      "ID Transaksi",
      "Tanggal",
      "Waktu",
      "Produk",
      "Qty",
      "Satuan",
      "Harga Satuan",
      "Total",
      "Kanal",
      "Status",
      "Pesan Asal / Referensi",
    ],
  ];

  for (const tx of transactions) {
    rows.push([
      tx.id,
      tx.transactionDate,
      tx.transactionTime,
      sanitizeCellValue(tx.productName),
      tx.quantity,
      sanitizeCellValue(tx.unit),
      tx.unitPrice,
      tx.totalAmount,
      tx.source,
      tx.status,
      sanitizeCellValue(tx.originalMessage || "-"),
    ]);
  }

  return rows;
}

export interface ProductRowData {
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
  isDefault: boolean;
  aliases: string[];
}

export function formatProductsSheet(products: ProductRowData[]): SheetMatrix {
  const rows: SheetMatrix = [
    [SHEET_BANNER_ROW_1],
    [SHEET_BANNER_ROW_2],
    [],
    [
      "Nama Produk",
      "Satuan",
      "Harga Satuan (IDR)",
      "Status Aktif",
      "Produk Default",
      "Alias Produk",
    ],
  ];

  for (const p of products) {
    rows.push([
      sanitizeCellValue(p.name),
      sanitizeCellValue(p.unit),
      p.price,
      p.isActive ? "AKTIF" : "NONAKTIF",
      p.isDefault ? "YA" : "TIDAK",
      sanitizeCellValue(p.aliases.join(", ")),
    ]);
  }

  return rows;
}

export interface DailyStatusRowData {
  date: string;
  status: string;
  source: string;
  notes?: string | null;
}

export function formatDailyStatusSheet(
  statuses: DailyStatusRowData[]
): SheetMatrix {
  const rows: SheetMatrix = [
    [SHEET_BANNER_ROW_1],
    [SHEET_BANNER_ROW_2],
    [],
    ["Tanggal", "Status", "Kanal", "Catatan"],
  ];

  for (const s of statuses) {
    rows.push([
      s.date,
      s.status,
      s.source,
      sanitizeCellValue(s.notes || "-"),
    ]);
  }

  return rows;
}

export interface ConfigSheetData {
  businessName: string;
  timezone: string;
  primaryChannel?: string;
  reminderChannel?: string;
  syncTimestamp?: Date;
}

export function formatConfigSheet(data: ConfigSheetData): SheetMatrix {
  const syncFormatted = (data.syncTimestamp || new Date()).toLocaleString("id-ID", {
    timeZone: data.timezone || "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return [
    [SHEET_BANNER_ROW_1],
    [SHEET_BANNER_ROW_2],
    [],
    ["PARAMETER", "NILAI"],
    ["Nama Bisnis", sanitizeCellValue(data.businessName)],
    ["Mata Uang", "IDR"],
    ["Zona Waktu", data.timezone || "Asia/Jakarta"],
    ["Kanal Utama", data.primaryChannel || "telegram"],
    ["Kanal Pengingat", data.reminderChannel || "telegram"],
    ["Terakhir Disinkronkan", syncFormatted],
    [
      "Pemberitahuan",
      "Google Sheets hanya mirror laporan. Perubahan spreadsheet tidak mengubah ledger OXID.",
    ],
  ];
}
