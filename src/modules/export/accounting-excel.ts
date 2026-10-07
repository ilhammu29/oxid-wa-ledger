import ExcelJS from "exceljs";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  getProfitAndLoss,
  getBalanceSheet,
  getCashFlowStatement,
  getStatementOfChangesInEquity,
  getTrialBalance,
} from "../accounting/reports";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF18181B" }, // Zinc-900
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FFFFFFFF" },
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE4E4E7" } },
  bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
  left: { style: "thin", color: { argb: "FFE4E4E7" } },
  right: { style: "thin", color: { argb: "FFE4E4E7" } },
};

const CURRENCY_FMT = '#,##0;(#,##0);"-"';

interface GlExportLine {
  id: string;
  debit: number | string;
  credit: number | string;
  description: string | null;
  chart_of_accounts: { code: string; name: string } | null;
  journal_entries: { entry_number: string; journal_date: string; source_type: string; reference: string | null } | null;
}

interface SaleExportRow {
  transaction_at: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total_amount: number | string;
  status: string;
  is_credit: boolean;
  customer_name: string | null;
}

interface ExpenseExportRow {
  expense_date: string;
  category: string;
  description: string | null;
  amount: number | string;
  payment_account: string | null;
  status: string;
}

interface PurchaseExportRow {
  purchase_date: string;
  item_name: string;
  quantity: number | string;
  unit: string | null;
  total_amount: number | string;
  is_credit: boolean;
  supplier_name: string | null;
}

interface ReceivableExportRow {
  customer_name: string;
  total_amount: number | string;
  paid_amount: number | string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface PayableExportRow {
  supplier_name: string;
  total_amount: number | string;
  paid_amount: number | string;
  status: string;
  due_date: string | null;
  created_at: string;
}

interface ProductExportRow {
  id: string;
  name: string;
  unit: string;
  unit_cost: number | string;
  default_price: number | string;
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = BORDER_STYLE;
  });
  row.height = 24;
}

function styleDataRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { name: "Arial", size: 9 };
    cell.border = BORDER_STYLE;
    cell.alignment = { vertical: "middle" };
  });
}

function autoFitColumns(sheet: ExcelJS.Worksheet): void {
  sheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? String(cell.value) : "";
      if (val.length > maxLen) {
        maxLen = Math.min(val.length + 3, 40);
      }
    });
    col.width = maxLen;
  });
}

/**
 * Generates an authoritative 14-sheet Excel workbook from the double-entry accounting engine.
 */
export async function generateAccountingExcelWorkbook(
  client: SupabaseClient,
  params: {
    businessId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  }
): Promise<Buffer> {
  const { businessId, startDate, endDate } = params;

  // 1. Fetch business metadata
  const { data: business } = await client
    .from("businesses")
    .select("id, name, timezone")
    .eq("id", businessId)
    .single();

  const businessName = business?.name || "OXID Ledger UMKM";

  // 2. Fetch authoritative financial reports
  const [pnl, bs, cf, equity, tb] = await Promise.all([
    getProfitAndLoss(client, { businessId, startDate, endDate }),
    getBalanceSheet(client, { businessId, asOfDate: endDate }),
    getCashFlowStatement(client, { businessId, startDate, endDate }),
    getStatementOfChangesInEquity(client, { businessId, startDate, endDate }),
    getTrialBalance(client, { businessId, asOfDate: endDate }),
  ]);

  // 3. Fetch sub-ledger rows
  const [
    salesRes,
    expensesRes,
    purchasesRes,
    receivablesRes,
    payablesRes,
    productsRes,
    inventoryRes,
    journalRes,
  ] = await Promise.all([
    client
      .from("transactions")
      .select("transaction_at, quantity, unit, unit_price, total_amount, status, is_credit, customer_name")
      .eq("business_id", businessId)
      .gte("transaction_at", `${startDate}T00:00:00Z`)
      .lte("transaction_at", `${endDate}T23:59:59Z`)
      .order("transaction_at", { ascending: true }),
    client
      .from("expenses")
      .select("expense_date, category, description, amount, payment_account, status")
      .eq("business_id", businessId)
      .gte("expense_date", startDate)
      .lte("expense_date", endDate)
      .order("expense_date", { ascending: true }),
    client
      .from("purchases")
      .select("purchase_date, item_name, quantity, unit, total_amount, is_credit, supplier_name")
      .eq("business_id", businessId)
      .gte("purchase_date", startDate)
      .lte("purchase_date", endDate)
      .order("purchase_date", { ascending: true }),
    client
      .from("receivables")
      .select("customer_name, total_amount, paid_amount, status, due_date, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true }),
    client
      .from("payables")
      .select("supplier_name, total_amount, paid_amount, status, due_date, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true }),
    client
      .from("products")
      .select("id, name, unit, unit_cost, default_price")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
    client
      .from("inventory_movements")
      .select("product_id, quantity")
      .eq("business_id", businessId),
    client
      .from("journal_lines")
      .select(`
        id, debit, credit, description,
        chart_of_accounts!inner(code, name),
        journal_entries!inner(entry_number, journal_date, source_type, reference, status)
      `)
      .eq("journal_entries.business_id", businessId)
      .neq("journal_entries.status", "voided")
      .gte("journal_entries.journal_date", startDate)
      .lte("journal_entries.journal_date", endDate)
      .order("journal_entries(journal_date)", { ascending: true }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OXID Ledger";
  workbook.lastModifiedBy = "OXID Ledger Accounting Core";
  workbook.created = new Date();
  workbook.modified = new Date();

  // ==========================================================================
  // SHEET 1: Ringkasan Eksekutif
  // ==========================================================================
  const sRingkasan = workbook.addWorksheet("Ringkasan", { views: [{ showGridLines: true }] });
  sRingkasan.columns = [
    { header: "Indikator Keuangan", key: "kpi", width: 32 },
    { header: "Nilai (IDR)", key: "val", width: 22 },
    { header: "Catatan", key: "note", width: 35 },
  ];
  styleHeaderRow(sRingkasan.getRow(1));

  const kasVal = bs.currentAssets.cash;
  const bankVal = bs.currentAssets.bank;
  const piutangVal = bs.currentAssets.accountsReceivable;
  const persediaanVal = bs.currentAssets.inventory;
  const hutangVal = bs.totalLiabilities;

  const kpiData = [
    ["Entitas Bisnis", businessName, "Multi-tenant isolated"],
    ["Periode Laporan", `${startDate} s.d. ${endDate}`, "Waktu lokal bisnis"],
    ["Total Omzet / Pendapatan", pnl.netRevenue, "Dari akun 4100 Pendapatan"],
    ["HPP (Harga Pokok Penjualan)", pnl.cogs, "Dari akun 5100 HPP"],
    ["Laba Kotor", pnl.grossProfit, "Omzet - HPP"],
    ["Beban Operasional", pnl.totalOperatingExpenses, "Beban usaha periode ini"],
    ["Laba Bersih", pnl.netProfit, "Laba Kotor - Total Beban"],
    ["Kas Tunai", kasVal, "Akun 1100 Kas"],
    ["Bank", bankVal, "Akun 1200 Bank"],
    ["Total Likuiditas", kasVal + bankVal, "Kas + Bank"],
    ["Piutang Usaha", piutangVal, "Hak tagih pelanggan"],
    ["Hutang Usaha", hutangVal, "Kewajiban supplier/pihak ketiga"],
    ["Nilai Persediaan", persediaanVal, "Aset lancar barang dagang"],
    ["Total Ekuitas", bs.equity.totalEquity, "Modal pemilik + Laba ditahan"],
    ["Status Keseimbangan Neraca", bs.isBalanced ? "SEIMBANG (Aset = Kewajiban + Ekuitas)" : "TIDAK SEIMBANG", "Double-Entry Invariant"],
  ];

  kpiData.forEach((row) => {
    const r = sRingkasan.addRow(row);
    styleDataRow(r);
    if (typeof row[1] === "number") {
      r.getCell(2).numFmt = CURRENCY_FMT;
    }
  });

  // ==========================================================================
  // SHEET 2: Laba Rugi (P&L)
  // ==========================================================================
  const sPnl = workbook.addWorksheet("Laba Rugi", { views: [{ showGridLines: true }] });
  sPnl.columns = [
    { header: "Komponen", key: "comp", width: 35 },
    { header: "Nominal (IDR)", key: "amt", width: 22 },
  ];
  styleHeaderRow(sPnl.getRow(1));

  const pnlRows: Array<[string, number | string]> = [
    ["PENDAPATAN", ""],
    ["  Penjualan Kotor", pnl.grossSales],
    ["  Retur Penjualan", pnl.salesReturns ? -pnl.salesReturns : 0],
    ["  Potongan Penjualan", pnl.salesDiscounts ? -pnl.salesDiscounts : 0],
    ["Total Pendapatan Bersih", pnl.netRevenue],
    ["HARGA POKOK PENJUALAN", ""],
    ["  HPP Persediaan Terjual", pnl.cogs],
    ["Total HPP", pnl.cogs],
    ["LABA KOTOR", pnl.grossProfit],
    ["BEBAN OPERASIONAL", ""],
    ...pnl.operatingExpenses.map((exp) => [`  ${exp.accountName} (${exp.accountCode})`, exp.amount] as [string, number]),
    ["Total Beban Operasional", pnl.totalOperatingExpenses],
    ["LABA OPERASIONAL", pnl.operatingProfit],
    ["LABA BERSIH TAHUN BERJALAN", pnl.netProfit],
  ];

  pnlRows.forEach((row) => {
    const r = sPnl.addRow(row);
    styleDataRow(r);
    if (typeof row[1] === "number") {
      r.getCell(2).numFmt = CURRENCY_FMT;
    }
    if (row[0].startsWith("Total") || row[0].startsWith("LABA")) {
      r.font = { name: "Arial", size: 9, bold: true };
    }
  });

  // ==========================================================================
  // SHEET 3: Neraca (Balance Sheet)
  // ==========================================================================
  const sBs = workbook.addWorksheet("Neraca", { views: [{ showGridLines: true }] });
  sBs.columns = [
    { header: "Pos Neraca", key: "pos", width: 35 },
    { header: "Nominal (IDR)", key: "amt", width: 22 },
  ];
  styleHeaderRow(sBs.getRow(1));

  const bsRows: Array<[string, number | string]> = [
    ["ASET LANCAR", ""],
    ["  Kas (1100)", bs.currentAssets.cash],
    ["  Bank (1200)", bs.currentAssets.bank],
    ["  Piutang Usaha (1300)", bs.currentAssets.accountsReceivable],
    ["  Persediaan Barang (1400)", bs.currentAssets.inventory],
    ["Total Aset Lancar", bs.currentAssets.totalCurrentAssets],
    ["ASET TIDAK LANCAR", ""],
    ["  Aset Tetap (1500)", bs.nonCurrentAssets.fixedAssetsCost],
    ["  Akumulasi Penyusutan (1590)", -bs.nonCurrentAssets.accumulatedDepreciation],
    ["Total Aset Tetap Bersih", bs.nonCurrentAssets.netFixedAssets],
    ["TOTAL ASET", bs.totalAssets],
    ["KEWAJIBAN", ""],
    ["  Hutang Usaha (2100)", bs.currentLiabilities.accountsPayable],
    ["  Kewajiban Lancar Lain (2300)", bs.currentLiabilities.otherCurrentLiabilities],
    ["  Hutang Bank / Jangka Panjang (2200)", bs.nonCurrentLiabilities.loansPayable],
    ["TOTAL KEWAJIBAN", bs.totalLiabilities],
    ["EKUITAS", ""],
    ["  Modal Pemilik (3100)", bs.equity.ownerCapital],
    ["  Prive Pemilik (3200)", -bs.equity.ownerDraw],
    ["  Laba Ditahan (3300)", bs.equity.retainedEarnings],
    ["  Laba Bersih Tahun Berjalan", bs.equity.currentPeriodProfit],
    ["TOTAL EKUITAS", bs.equity.totalEquity],
    ["TOTAL KEWAJIBAN + EKUITAS", bs.totalLiabilitiesAndEquity],
  ];

  bsRows.forEach((row) => {
    const r = sBs.addRow(row);
    styleDataRow(r);
    if (typeof row[1] === "number") {
      r.getCell(2).numFmt = CURRENCY_FMT;
    }
    if (row[0].startsWith("TOTAL")) {
      r.font = { name: "Arial", size: 9, bold: true };
    }
  });

  // ==========================================================================
  // SHEET 4: Arus Kas (Cash Flow)
  // ==========================================================================
  const sCf = workbook.addWorksheet("Arus Kas", { views: [{ showGridLines: true }] });
  sCf.columns = [
    { header: "Aktivitas Arus Kas", key: "act", width: 38 },
    { header: "Nominal (IDR)", key: "amt", width: 22 },
  ];
  styleHeaderRow(sCf.getRow(1));

  const cfRows: Array<[string, number | string]> = [
    ["Arus Kas dari Aktivitas Operasi:", ""],
    ["  Penerimaan Kas dari Penjualan", cf.cashFromSales],
    ["  Penerimaan Pelunasan Piutang", cf.customerCollections],
    ["  Pembayaran Kas untuk Beban Usaha", -cf.cashPaidForExpenses],
    ["  Pembayaran Kas ke Pemasok / Pembelian", -cf.cashPaidToSuppliers],
    ["Arus Kas Bersih dari Aktivitas Operasi", cf.netOperatingCashFlow],
    ["Arus Kas dari Aktivitas Investasi:", ""],
    ["  Pembelian Aset Tetap", -cf.fixedAssetPurchases],
    ["Arus Kas Bersih dari Aktivitas Investasi", cf.netInvestingCashFlow],
    ["Arus Kas dari Aktivitas Pendanaan:", ""],
    ["  Setoran Modal Pemilik", cf.capitalContributions],
    ["  Penarikan Prive Pemilik", -cf.ownerWithdrawals],
    ["  Pencairan Pinjaman", cf.loanProceeds],
    ["  Pembayaran Pokok Pinjaman", -cf.loanPrincipalRepayments],
    ["Arus Kas Bersih dari Aktivitas Pendanaan", cf.netFinancingCashFlow],
    ["Kenaikan / (Penurunan) Kas Bersih", cf.netCashChange],
    ["Saldo Kas Awal Periode", cf.beginningCashAndBank],
    ["Saldo Kas Akhir Periode", cf.endingCashAndBank],
  ];

  cfRows.forEach((row) => {
    const r = sCf.addRow(row);
    styleDataRow(r);
    if (typeof row[1] === "number") {
      r.getCell(2).numFmt = CURRENCY_FMT;
    }
    if (row[0].startsWith("Arus Kas Bersih") || row[0].startsWith("Saldo") || row[0].startsWith("Kenaikan")) {
      r.font = { name: "Arial", size: 9, bold: true };
    }
  });

  // ==========================================================================
  // SHEET 5: Perubahan Ekuitas
  // ==========================================================================
  const sEquity = workbook.addWorksheet("Perubahan Ekuitas", { views: [{ showGridLines: true }] });
  sEquity.columns = [
    { header: "Pos Ekuitas", key: "pos", width: 35 },
    { header: "Nominal (IDR)", key: "amt", width: 22 },
  ];
  styleHeaderRow(sEquity.getRow(1));

  const eqRows: Array<[string, number | string]> = [
    ["Modal Awal Pemilik", equity.beginningEquity],
    ["Setoran Modal Periode Ini", equity.capitalAdditions],
    ["Penarikan Prive Periode Ini", -equity.ownerDraws],
    ["Laba Bersih Periode Ini", equity.netProfit],
    ["Kenaikan / (Penurunan) Ekuitas Bersih", equity.endingEquity - equity.beginningEquity],
    ["Modal Akhir Pemilik", equity.endingEquity],
  ];

  eqRows.forEach((row) => {
    const r = sEquity.addRow(row);
    styleDataRow(r);
    if (typeof row[1] === "number") {
      r.getCell(2).numFmt = CURRENCY_FMT;
    }
    if (row[0].startsWith("Modal Akhir") || row[0].startsWith("Kenaikan")) {
      r.font = { name: "Arial", size: 9, bold: true };
    }
  });

  // ==========================================================================
  // SHEET 6: Neraca Saldo (Trial Balance)
  // ==========================================================================
  const sTb = workbook.addWorksheet("Neraca Saldo", { views: [{ showGridLines: true }] });
  sTb.columns = [
    { header: "Kode", key: "code", width: 10 },
    { header: "Nama Akun", key: "name", width: 28 },
    { header: "Tipe", key: "type", width: 14 },
    { header: "Debit (IDR)", key: "debit", width: 18 },
    { header: "Kredit (IDR)", key: "credit", width: 18 },
  ];
  styleHeaderRow(sTb.getRow(1));

  (tb?.items || []).forEach((item) => {
    const r = sTb.addRow([
      item.accountCode,
      item.accountName,
      item.accountType,
      item.debit,
      item.credit,
    ]);
    styleDataRow(r);
    r.getCell(4).numFmt = CURRENCY_FMT;
    r.getCell(5).numFmt = CURRENCY_FMT;
  });

  const tbTotalRow = sTb.addRow([
    "TOTAL",
    "",
    tb?.isBalanced ? "SEIMBANG" : "TIDAK SEIMBANG",
    tb?.totalDebit || 0,
    tb?.totalCredit || 0,
  ]);
  styleDataRow(tbTotalRow);
  tbTotalRow.font = { name: "Arial", size: 9, bold: true };
  tbTotalRow.getCell(4).numFmt = CURRENCY_FMT;
  tbTotalRow.getCell(5).numFmt = CURRENCY_FMT;

  // ==========================================================================
  // SHEET 7: Buku Besar (General Ledger)
  // ==========================================================================
  const sGl = workbook.addWorksheet("Buku Besar", { views: [{ showGridLines: true }] });
  sGl.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "No. Jurnal", key: "entry", width: 16 },
    { header: "Kode Akun", key: "code", width: 12 },
    { header: "Nama Akun", key: "account", width: 24 },
    { header: "Keterangan", key: "desc", width: 30 },
    { header: "Debit (IDR)", key: "debit", width: 16 },
    { header: "Kredit (IDR)", key: "credit", width: 16 },
  ];
  styleHeaderRow(sGl.getRow(1));

  const glLines = (journalRes.data || []) as unknown as GlExportLine[];
  glLines.forEach((row) => {
    const r = sGl.addRow([
      row.journal_entries?.journal_date || "",
      row.journal_entries?.entry_number || "",
      row.chart_of_accounts?.code || "",
      row.chart_of_accounts?.name || "",
      row.description || row.journal_entries?.reference || "",
      Number(row.debit) || 0,
      Number(row.credit) || 0,
    ]);
    styleDataRow(r);
    r.getCell(6).numFmt = CURRENCY_FMT;
    r.getCell(7).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 8: Jurnal Umum
  // ==========================================================================
  const sJournal = workbook.addWorksheet("Jurnal Umum", { views: [{ showGridLines: true }] });
  sJournal.columns = [
    { header: "No. Jurnal", key: "no", width: 16 },
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Sumber", key: "source", width: 16 },
    { header: "Keterangan", key: "desc", width: 28 },
    { header: "Akun", key: "acc", width: 24 },
    { header: "Debit (IDR)", key: "debit", width: 16 },
    { header: "Kredit (IDR)", key: "credit", width: 16 },
  ];
  styleHeaderRow(sJournal.getRow(1));

  glLines.forEach((row) => {
    const r = sJournal.addRow([
      row.journal_entries?.entry_number || "",
      row.journal_entries?.journal_date || "",
      row.journal_entries?.source_type || "",
      row.description || "",
      `${row.chart_of_accounts?.code} - ${row.chart_of_accounts?.name}`,
      Number(row.debit) || 0,
      Number(row.credit) || 0,
    ]);
    styleDataRow(r);
    r.getCell(6).numFmt = CURRENCY_FMT;
    r.getCell(7).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 9: Penjualan
  // ==========================================================================
  const sSales = workbook.addWorksheet("Penjualan", { views: [{ showGridLines: true }] });
  sSales.columns = [
    { header: "Waktu Transaksi", key: "time", width: 20 },
    { header: "Jumlah", key: "qty", width: 12 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "Harga Satuan", key: "price", width: 16 },
    { header: "Total Omzet", key: "total", width: 18 },
    { header: "Metode", key: "method", width: 12 },
    { header: "Pelanggan", key: "cust", width: 20 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(sSales.getRow(1));

  ((salesRes.data || []) as unknown as SaleExportRow[]).forEach((row) => {
    const r = sSales.addRow([
      row.transaction_at,
      Number(row.quantity),
      row.unit,
      Number(row.unit_price),
      Number(row.total_amount),
      row.is_credit ? "Kredit" : "Tunai",
      row.customer_name || "Pelanggan Umum",
      row.status,
    ]);
    styleDataRow(r);
    r.getCell(4).numFmt = CURRENCY_FMT;
    r.getCell(5).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 10: Pengeluaran
  // ==========================================================================
  const sExpenses = workbook.addWorksheet("Pengeluaran", { views: [{ showGridLines: true }] });
  sExpenses.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Kategori", key: "cat", width: 18 },
    { header: "Keterangan", key: "desc", width: 30 },
    { header: "Nominal (IDR)", key: "amt", width: 18 },
    { header: "Metode Bayar", key: "pay", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(sExpenses.getRow(1));

  ((expensesRes.data || []) as unknown as ExpenseExportRow[]).forEach((row) => {
    const r = sExpenses.addRow([
      row.expense_date,
      row.category,
      row.description,
      Number(row.amount),
      row.payment_account || "KAS",
      row.status,
    ]);
    styleDataRow(r);
    r.getCell(4).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 11: Pembelian
  // ==========================================================================
  const sPurchases = workbook.addWorksheet("Pembelian", { views: [{ showGridLines: true }] });
  sPurchases.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Nama Barang", key: "item", width: 24 },
    { header: "Qty", key: "qty", width: 12 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "Total Pembelian", key: "total", width: 18 },
    { header: "Metode", key: "type", width: 12 },
    { header: "Supplier", key: "supp", width: 22 },
  ];
  styleHeaderRow(sPurchases.getRow(1));

  ((purchasesRes.data || []) as unknown as PurchaseExportRow[]).forEach((row) => {
    const r = sPurchases.addRow([
      row.purchase_date,
      row.item_name,
      Number(row.quantity),
      row.unit || "kg",
      Number(row.total_amount),
      row.is_credit ? "Kredit" : "Tunai",
      row.supplier_name || "Pemasok",
    ]);
    styleDataRow(r);
    r.getCell(5).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 12: Piutang
  // ==========================================================================
  const sReceivables = workbook.addWorksheet("Piutang", { views: [{ showGridLines: true }] });
  sReceivables.columns = [
    { header: "Pelanggan", key: "cust", width: 22 },
    { header: "Total Piutang", key: "total", width: 18 },
    { header: "Sudah Dibayar", key: "paid", width: 18 },
    { header: "Sisa Tagihan", key: "rem", width: 18 },
    { header: "Jatuh Tempo", key: "due", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(sReceivables.getRow(1));

  ((receivablesRes.data || []) as unknown as ReceivableExportRow[]).forEach((row) => {
    const total = Number(row.total_amount) || 0;
    const paid = Number(row.paid_amount) || 0;
    const r = sReceivables.addRow([
      row.customer_name,
      total,
      paid,
      total - paid,
      row.due_date || "-",
      row.status,
    ]);
    styleDataRow(r);
    r.getCell(2).numFmt = CURRENCY_FMT;
    r.getCell(3).numFmt = CURRENCY_FMT;
    r.getCell(4).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 13: Hutang
  // ==========================================================================
  const sPayables = workbook.addWorksheet("Hutang", { views: [{ showGridLines: true }] });
  sPayables.columns = [
    { header: "Supplier / Pihak", key: "supp", width: 22 },
    { header: "Total Hutang", key: "total", width: 18 },
    { header: "Sudah Dibayar", key: "paid", width: 18 },
    { header: "Sisa Hutang", key: "rem", width: 18 },
    { header: "Jatuh Tempo", key: "due", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  styleHeaderRow(sPayables.getRow(1));

  ((payablesRes.data || []) as unknown as PayableExportRow[]).forEach((row) => {
    const total = Number(row.total_amount) || 0;
    const paid = Number(row.paid_amount) || 0;
    const r = sPayables.addRow([
      row.supplier_name,
      total,
      paid,
      total - paid,
      row.due_date || "-",
      row.status,
    ]);
    styleDataRow(r);
    r.getCell(2).numFmt = CURRENCY_FMT;
    r.getCell(3).numFmt = CURRENCY_FMT;
    r.getCell(4).numFmt = CURRENCY_FMT;
  });

  // ==========================================================================
  // SHEET 14: Persediaan
  // ==========================================================================
  const sInventory = workbook.addWorksheet("Persediaan", { views: [{ showGridLines: true }] });
  sInventory.columns = [
    { header: "Nama Produk", key: "name", width: 24 },
    { header: "Stok Tersedia", key: "stock", width: 14 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "HPP / Harga Pokok", key: "cost", width: 18 },
    { header: "Harga Jual Standar", key: "price", width: 18 },
    { header: "Total Nilai Persediaan", key: "val", width: 22 },
  ];
  styleHeaderRow(sInventory.getRow(1));

  const stockByProductId = new Map<string, number>();
  (inventoryRes.data || []).forEach((m: { product_id: string; quantity: number | string }) => {
    stockByProductId.set(
      m.product_id,
      (stockByProductId.get(m.product_id) || 0) + Number(m.quantity)
    );
  });

  ((productsRes.data || []) as unknown as ProductExportRow[]).forEach((p) => {
    const stock = stockByProductId.get(p.id) || 0;
    const cost = Number(p.unit_cost) || 0;
    const r = sInventory.addRow([
      p.name,
      stock,
      p.unit,
      cost,
      Number(p.default_price) || 0,
      stock * cost,
    ]);
    styleDataRow(r);
    r.getCell(4).numFmt = CURRENCY_FMT;
    r.getCell(5).numFmt = CURRENCY_FMT;
    r.getCell(6).numFmt = CURRENCY_FMT;
  });

  // Freeze pane on all sheets
  workbook.worksheets.forEach((ws) => {
    ws.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];
    autoFitColumns(ws);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
