import ExcelJS from "exceljs";

export interface ExportData {
  business: {
    id: string;
    name: string;
    timezone: string;
    currency: string;
  };
  overviewKPIs: {
    todayRevenue: number;
    todayQuantity: number;
    todayTransactionCount: number;
    weekRevenue: number;
    monthRevenue: number;
  };
  dailySeries: {
    date: string;
    revenue: number;
    quantity: number;
    transactionCount: number;
  }[];
  transactions: {
    id: string;
    transaction_at: string;
    source: string;
    product_name?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_amount: number;
    status: string;
    raw_message?: string | null;
  }[];
  products: {
    id: string;
    name: string;
    unit: string;
    default_price: number;
    active: boolean;
    is_default: boolean;
  }[];
  dailyStatuses: {
    local_date: string;
    status: string;
    source: string;
    note?: string | null;
  }[];
}

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

const CELL_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFE4E4E7" } },
  bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
  left: { style: "thin", color: { argb: "FFE4E4E7" } },
  right: { style: "thin", color: { argb: "FFE4E4E7" } },
};

/**
 * Builds a multi-worksheet XLSX workbook for business financial auditing and reporting.
 */
export async function generateLedgerWorkbook(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OXID WA Ledger";
  workbook.lastModifiedBy = "OXID Ledger Export Service";
  workbook.created = new Date();
  workbook.modified = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Dashboard
  // --------------------------------------------------------------------------
  const dashSheet = workbook.addWorksheet("Dashboard", {
    views: [{ showGridLines: true }],
  });

  dashSheet.columns = [
    { key: "col1", width: 22 },
    { key: "col2", width: 20 },
    { key: "col3", width: 20 },
    { key: "col4", width: 20 },
    { key: "col5", width: 20 },
  ];

  // Header Title
  dashSheet.mergeCells("A1:E1");
  const titleCell = dashSheet.getCell("A1");
  titleCell.value = `RINGKASAN OPERASIONAL - ${data.business.name.toUpperCase()}`;
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF18181B" } };
  dashSheet.getRow(1).height = 30;

  // Metadata
  dashSheet.getCell("A2").value = "Tanggal Ekspor:";
  dashSheet.getCell("B2").value = new Date().toISOString().replace("T", " ").slice(0, 19);
  dashSheet.getCell("A3").value = "Zona Waktu Bisnis:";
  dashSheet.getCell("B3").value = data.business.timezone;
  dashSheet.getCell("A4").value = "Mata Uang:";
  dashSheet.getCell("B4").value = data.business.currency || "IDR";
  for (let r = 2; r <= 4; r++) {
    dashSheet.getCell(`A${r}`).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF71717A" } };
    dashSheet.getCell(`B${r}`).font = { name: "Arial", size: 9, color: { argb: "FF18181B" } };
  }

  // Summary KPIs Section
  dashSheet.getCell("A6").value = "INDIKATOR KINERJA UTAMA (KPI)";
  dashSheet.getCell("A6").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF18181B" } };

  const kpiHeaders = ["Metrik", "Nilai", "Satuan / Keterangan"];
  const kpiHeadRow = dashSheet.getRow(7);
  kpiHeadRow.values = kpiHeaders;
  kpiHeadRow.height = 24;
  kpiHeadRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });

  const confirmedTx = data.transactions.filter((t) => t.status === "confirmed");
  const allRev = confirmedTx.reduce((sum, t) => sum + t.total_amount, 0);
  const allQty = confirmedTx.reduce((sum, t) => sum + t.quantity, 0);
  const allCount = confirmedTx.length;
  const avgTx = allCount > 0 ? Math.round(allRev / allCount) : 0;

  const kpisData = [
    ["Omzet Hari Ini", data.overviewKPIs.todayRevenue, "IDR (Hari Berjalan)"],
    ["Kuantitas Hari Ini", data.overviewKPIs.todayQuantity, "Unit Terjual Hari Ini"],
    ["Jumlah Transaksi Hari Ini", data.overviewKPIs.todayTransactionCount, "Transaksi Terkonfirmasi"],
    ["Omzet Minggu Ini", data.overviewKPIs.weekRevenue, "IDR (Senin - Minggu)"],
    ["Omzet Bulan Ini", data.overviewKPIs.monthRevenue, "IDR (Bulan Kalender Berjalan)"],
    ["Total Omzet Keseluruhan", allRev, "IDR (Semua Transaksi Terkonfirmasi)"],
    ["Total Kuantitas Keseluruhan", allQty, "Unit (Semua Transaksi Terkonfirmasi)"],
    ["Total Transaksi Terkonfirmasi", allCount, "Transaksi Terkonfirmasi"],
    ["Rata-rata Nilai Transaksi (AOV)", avgTx, "IDR per Transaksi Terkonfirmasi"],
  ];

  kpisData.forEach((item, idx) => {
    const rowNum = 8 + idx;
    const row = dashSheet.getRow(rowNum);
    row.values = item;
    row.font = CELL_FONT;
    row.height = 20;
    dashSheet.getCell(`A${rowNum}`).border = BORDER_STYLE;
    dashSheet.getCell(`B${rowNum}`).border = BORDER_STYLE;
    dashSheet.getCell(`C${rowNum}`).border = BORDER_STYLE;

    // Format currency or numbers
    const isMoney = [0, 3, 4, 5, 8].includes(idx);
    const isQty = [1, 6].includes(idx);
    if (isMoney) {
      dashSheet.getCell(`B${rowNum}`).numFmt = '"Rp"#,##0;("Rp"#,##0);"-"';
    } else if (isQty) {
      dashSheet.getCell(`B${rowNum}`).numFmt = '#,##0.000';
    } else {
      dashSheet.getCell(`B${rowNum}`).numFmt = '#,##0';
    }
  });

  // 14-Day Sales Series Table
  const seriesStartRow = 19;
  dashSheet.getCell(`A${seriesStartRow}`).value = "TREN PENJUALAN 14 HARI TERAKHIR";
  dashSheet.getCell(`A${seriesStartRow}`).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF18181B" } };

  const seriesHeadRow = dashSheet.getRow(seriesStartRow + 1);
  seriesHeadRow.values = ["Tanggal (Local)", "Omzet (IDR)", "Kuantitas", "Jumlah Transaksi"];
  seriesHeadRow.height = 24;
  seriesHeadRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });

  data.dailySeries.forEach((pt, idx) => {
    const rowNum = seriesStartRow + 2 + idx;
    const row = dashSheet.getRow(rowNum);
    row.values = [pt.date, pt.revenue, pt.quantity, pt.transactionCount];
    row.font = CELL_FONT;
    row.height = 19;
    dashSheet.getCell(`A${rowNum}`).border = BORDER_STYLE;
    dashSheet.getCell(`B${rowNum}`).border = BORDER_STYLE;
    dashSheet.getCell(`C${rowNum}`).border = BORDER_STYLE;
    dashSheet.getCell(`D${rowNum}`).border = BORDER_STYLE;

    dashSheet.getCell(`B${rowNum}`).numFmt = '"Rp"#,##0;("Rp"#,##0);"-"';
    dashSheet.getCell(`C${rowNum}`).numFmt = '#,##0.000';
    dashSheet.getCell(`D${rowNum}`).numFmt = '#,##0';
  });

  // --------------------------------------------------------------------------
  // SHEET 2: Transactions
  // --------------------------------------------------------------------------
  const txSheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  txSheet.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Waktu", key: "time", width: 12 },
    { header: "Channel / Source", key: "source", width: 18 },
    { header: "Produk", key: "product", width: 22 },
    { header: "Kuantitas", key: "qty", width: 14 },
    { header: "Satuan", key: "unit", width: 10 },
    { header: "Harga Satuan (IDR)", key: "unit_price", width: 20 },
    { header: "Total Omzet (IDR)", key: "revenue", width: 20 },
    { header: "Status", key: "status", width: 14 },
    { header: "Pesan / Catatan", key: "note", width: 35 },
  ];

  const txHeaderRow = txSheet.getRow(1);
  txHeaderRow.height = 26;
  txHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  data.transactions.forEach((tx) => {
    const d = new Date(tx.transaction_at);
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toISOString().slice(11, 19);

    const row = txSheet.addRow({
      date: dateStr,
      time: timeStr,
      source: tx.source.toUpperCase(),
      product: tx.product_name || "Produk Default",
      qty: tx.quantity,
      unit: tx.unit,
      unit_price: tx.unit_price,
      revenue: tx.total_amount,
      status: tx.status.toUpperCase(),
      note: tx.raw_message || "",
    });

    row.font = CELL_FONT;
    row.height = 20;

    row.getCell("qty").numFmt = "#,##0.000";
    row.getCell("unit_price").numFmt = '"Rp"#,##0;("Rp"#,##0);"-"';
    row.getCell("revenue").numFmt = '"Rp"#,##0;("Rp"#,##0);"-"';

    // Status coloring
    const statusCell = row.getCell("status");
    if (tx.status === "confirmed") {
      statusCell.font = { name: "Arial", size: 10, color: { argb: "FF166534" }, bold: true };
    } else if (tx.status === "cancelled") {
      statusCell.font = { name: "Arial", size: 10, color: { argb: "FF991B1B" }, italic: true };
    } else if (tx.status === "corrected") {
      statusCell.font = { name: "Arial", size: 10, color: { argb: "FF854D0E" } };
    }

    row.eachCell((c) => {
      c.border = BORDER_STYLE;
    });
  });

  txSheet.autoFilter = {
    from: "A1",
    to: `J${Math.max(2, data.transactions.length + 1)}`,
  };

  // --------------------------------------------------------------------------
  // SHEET 3: Products
  // --------------------------------------------------------------------------
  const prodSheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  prodSheet.columns = [
    { header: "Nama Produk", key: "name", width: 25 },
    { header: "Satuan", key: "unit", width: 12 },
    { header: "Harga Satuan (IDR)", key: "price", width: 22 },
    { header: "Status Aktif", key: "active", width: 15 },
    { header: "Produk Default", key: "default", width: 16 },
  ];

  const prodHeaderRow = prodSheet.getRow(1);
  prodHeaderRow.height = 26;
  prodHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });

  data.products.forEach((p) => {
    const row = prodSheet.addRow({
      name: p.name,
      unit: p.unit,
      price: p.default_price,
      active: p.active ? "Aktif" : "Nonaktif",
      default: p.is_default ? "DEFAULT" : "-",
    });

    row.font = CELL_FONT;
    row.height = 20;
    row.getCell("price").numFmt = '"Rp"#,##0;("Rp"#,##0);"-"';

    if (p.is_default) {
      row.getCell("default").font = { name: "Arial", size: 10, bold: true, color: { argb: "FF166534" } };
    }

    row.eachCell((c) => {
      c.border = BORDER_STYLE;
    });
  });

  prodSheet.autoFilter = {
    from: "A1",
    to: `E${Math.max(2, data.products.length + 1)}`,
  };

  // --------------------------------------------------------------------------
  // SHEET 4: Daily_Status
  // --------------------------------------------------------------------------
  const statusSheet = workbook.addWorksheet("Daily_Status", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }],
  });

  statusSheet.columns = [
    { header: "Tanggal", key: "date", width: 15 },
    { header: "Status Operasional", key: "status", width: 22 },
    { header: "Sumber / Kanal", key: "source", width: 18 },
    { header: "Catatan", key: "note", width: 35 },
  ];

  const statusHeaderRow = statusSheet.getRow(1);
  statusHeaderRow.height = 26;
  statusHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });

  data.dailyStatuses.forEach((st) => {
    const row = statusSheet.addRow({
      date: st.local_date,
      status: st.status,
      source: st.source.toUpperCase(),
      note: st.note || "-",
    });

    row.font = CELL_FONT;
    row.height = 20;

    row.eachCell((c) => {
      c.border = BORDER_STYLE;
    });
  });

  statusSheet.autoFilter = {
    from: "A1",
    to: `D${Math.max(2, data.dailyStatuses.length + 1)}`,
  };

  // --------------------------------------------------------------------------
  // SHEET 5: Config
  // --------------------------------------------------------------------------
  const configSheet = workbook.addWorksheet("Config", {
    views: [{ showGridLines: true }],
  });

  configSheet.columns = [
    { header: "Parameter Konfigurasi", key: "param", width: 30 },
    { header: "Nilai", key: "val", width: 45 },
  ];

  const configHeaderRow = configSheet.getRow(1);
  configHeaderRow.height = 26;
  configHeaderRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
  });

  const configData = [
    ["Nama Bisnis", data.business.name],
    ["ID Bisnis (UUID)", data.business.id],
    ["Zona Waktu Ledger", data.business.timezone],
    ["Mata Uang Standar", data.business.currency || "IDR"],
    ["Waktu Pembuatan Dokumen", new Date().toISOString()],
    ["Format Standar Angka", "Integer BIGINT IDR & Decimal NUMERIC(12,3)"],
    [
      "Prinsip Integritas Keuangan",
      "Supabase/PostgreSQL is the financial source of truth. This spreadsheet is generated for reporting and analysis only.",
    ],
  ];

  configData.forEach((item) => {
    const row = configSheet.addRow(item);
    row.font = CELL_FONT;
    row.height = 22;
    row.eachCell((c) => {
      c.border = BORDER_STYLE;
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
