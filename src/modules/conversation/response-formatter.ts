/**
 * Centralized Deterministic Indonesian Response Formatter for OXID WA Ledger.
 * Step 6C: Provides standardized, natural Indonesian copy for small business operators
 * across Telegram, WhatsApp, and conversation execution engines without LLMs.
 */

import { formatRupiah } from "../transactions/money";
import { ReportResultDTO, CancelResultDTO, CorrectResultDTO } from "../transactions/types";
import { ParsedMessage } from "../parser/types";

export interface SaleFormatterParams {
  product: {
    name: string;
    unitPrice: number;
    unit: string;
    isDefaultUsed: boolean;
  };
  quantity: number;
  totalAmount: number;
  todaySummary: {
    totalRevenue: number;
    totalQuantity: number;
    transactionCount: number;
  };
}

/**
 * Formats a successful sale response according to Step 6C specifications.
 */
export function formatSaleSuccess(params: SaleFormatterParams): string {
  const lineTotal = formatRupiah(params.totalAmount);
  const unitPriceFormatted = formatRupiah(params.product.unitPrice);
  const todayRevFormatted = formatRupiah(params.todaySummary.totalRevenue);

  const header = `✅ Penjualan dicatat\n\n`;
  const productLine = `${params.product.name}\n${params.quantity} ${params.product.unit} × ${unitPriceFormatted}\nTotal: ${lineTotal}\n\n`;

  if (params.product.isDefaultUsed) {
    return (
      header +
      productLine +
      `${params.product.name} digunakan karena merupakan produk default.`
    );
  }

  return (
    header +
    productLine +
    `Omzet hari ini: ${todayRevFormatted}`
  );
}

/**
 * Formats rejection message when multiple products are detected in one message.
 */
export function formatMultiProductDetected(candidateProducts: string[]): string {
  const examples =
    candidateProducts.length >= 2
      ? `\n• Kejual ${candidateProducts[0].toLowerCase()} 10kg\n• Kejual ${candidateProducts[1].toLowerCase()} 5kg`
      : `\n• Kejual lele 10kg\n• Kejual nila 5kg`;

  return (
    `Saya menemukan lebih dari satu produk dalam satu pesan.\n\n` +
    `Untuk sekarang kirim satu transaksi per pesan:${examples}`
  );
}

/**
 * Formats clarification message when multiple active products match the same term.
 */
export function formatAmbiguousProductMatch(candidates: string[]): string {
  const list = candidates.map((c) => `• ${c}`).join("\n");
  return (
    `Saya menemukan lebih dari satu produk:\n` +
    `${list}\n\n` +
    `Sebutkan produk yang dimaksud.`
  );
}

/**
 * Formats warning when an explicit product term is unknown to the business.
 */
export function formatUnknownProduct(unknownTerm: string, activeProducts: string[]): string {
  const activeList =
    activeProducts.length > 0
      ? `Produk aktif:\n${activeProducts.map((p) => `• ${p}`).join("\n")}\n\n`
      : `Belum ada produk aktif yang terdaftar di dashboard.\n\n`;

  return (
    `Produk '${unknownTerm}' belum terdaftar.\n\n` +
    activeList +
    `Tambahkan produk melalui dashboard jika diperlukan.`
  );
}

/**
 * Formats daily sales report with optional product breakdown.
 */
export function formatDailyReport(
  report: ReportResultDTO,
  breakdown?: Array<{ productName: string; quantity: number; unit: string }>
): string {
  const revFormatted = formatRupiah(report.totalRevenue);
  let text =
    `📊 Ringkasan hari ini\n\n` +
    `Omzet: ${revFormatted}\n` +
    `Terjual: ${report.totalQuantity} kg\n` +
    `Transaksi: ${report.transactionCount}`;

  if (breakdown && breakdown.length > 0) {
    const lines = breakdown.map((b) => `${b.productName}: ${b.quantity} ${b.unit}`);
    text += `\n\n${lines.join("\n")}`;
  }

  return text;
}

/**
 * Formats weekly or monthly sales report.
 */
export function formatPeriodReport(period: "week" | "month", report: ReportResultDTO): string {
  const title = period === "week" ? "Ringkasan minggu ini" : "Ringkasan bulan ini";
  const revFormatted = formatRupiah(report.totalRevenue);

  return (
    `📊 ${title}\n\n` +
    `Omzet: ${revFormatted}\n` +
    `Terjual: ${report.totalQuantity} kg\n` +
    `Transaksi: ${report.transactionCount}`
  );
}

/**
 * Formats general help text with optional active product listing.
 */
export function formatHelp(activeProducts?: string[]): string {
  let text =
    `📖 Panduan Operator OXID Ledger\n\n` +
    `✍️ CATAT TRANSAKSI:\n` +
    `• Kejual lele 10kg (Penjualan)\n` +
    `• Listrik 150rb (Pengeluaran operasional)\n` +
    `• Beli stok lele 50kg 1jt (Pembelian persediaan)\n` +
    `• Modal masuk 5jt (Setoran modal pemilik)\n` +
    `• Prive 500rb (Penarikan dana pribadi)\n` +
    `• Budi bayar piutang 500rb (Pelunasan piutang)\n` +
    `• Bayar hutang supplier 1jt (Pelunasan hutang)\n\n` +
    `🔍 CEK SALDO & OPERASIONAL:\n` +
    `• /saldo — Saldo kas & bank terkini\n` +
    `• /stok — Sisa stok persediaan gudang\n` +
    `• /piutang — Tagihan pelanggan belum lunas\n` +
    `• /hutang — Kewajiban supplier belum dibayar\n\n` +
    `📊 LAPORAN KEUANGAN (Paket Pro):\n` +
    `• /laba — Laporan Laba Rugi (Omzet, HPP, Laba Bersih)\n` +
    `• /neraca — Laporan Neraca (Aset, Kewajiban, Ekuitas)\n` +
    `• /aruskas — Laporan Arus Kas (Operasi, Investasi, Pendanaan)\n` +
    `• /bukubesar — Ringkasan mutasi Buku Besar\n` +
    `• /neracasaldo — Neraca Saldo pembukuan\n\n` +
    `📥 EKSPOR LAPORAN (Paket Pro):\n` +
    `• /export — Unduh file workbook Excel (14 Sheet)\n\n` +
    `↩️ KOREKSI & PEMBATALAN:\n` +
    `• Batal terakhir — Batalkan transaksi terakhir\n` +
    `• Ubah terakhir jadi 20kg — Koreksi kuantitas transaksi\n\n` +
    `📅 STATUS OPERASIONAL:\n` +
    `• Gak ada penjualan hari ini — Tandai nihil penjualan\n` +
    `• Hari ini libur — Tandai hari libur operasional\n\n` +
    `💡 Tips Operator:\n` +
    `• Kirim 1 transaksi per pesan\n` +
    `• Gunakan nama produk sesuai katalog atau produk default\n` +
    `• Nominal rupiah dapat disingkat: 150rb, 1.5jt, 500k`;

  if (activeProducts && activeProducts.length > 0) {
    text += `\n\n🏷️ Produk aktif:\n` + activeProducts.map((p) => `• ${p}`).join("\n");
  }

  return text;
}

/**
 * Formats friendly error copy, hiding database details, SQL errors, and UUIDs.
 */
export function formatFriendlyError(errorCode?: string, fallbackMessage?: string): string {
  switch (errorCode) {
    case "DEFAULT_PRODUCT_NOT_CONFIGURED":
      return "Belum ada produk default. Atur produk default melalui dashboard.";
    case "DAY_STATUS_CONFLICT":
      return "Hari ini sudah ditandai tidak ada penjualan/libur. Ubah status hari terlebih dahulu sebelum mencatat transaksi.";
    case "DAY_STATUS_HAS_SALES":
      return "Tidak dapat menandai libur/tanpa penjualan karena sudah ada transaksi tercatat hari ini.";
    case "PRODUCT_NOT_FOUND":
      return "Produk tidak ditemukan atau belum aktif di sistem.";
    case "UNIT_MISMATCH":
      return "Satuan tidak sesuai dengan konfigurasi produk.";
    case "INVALID_QUANTITY":
      return "Jumlah penjualan tidak valid. Masukkan angka lebih besar dari 0.";
    case "UNAUTHORIZED":
      return "Nomor pengirim atau akun belum terdaftar sebagai anggota bisnis ini.";
    case "TRANSACTION_NOT_FOUND":
      return "Tidak ada transaksi yang dapat dibatalkan atau dikoreksi.";
    case "TRANSACTION_ALREADY_CANCELLED":
      return "Transaksi tersebut sudah dibatalkan sebelumnya.";
    default:
      if (fallbackMessage && !fallbackMessage.includes("UUID") && !fallbackMessage.includes("relation") && !fallbackMessage.includes("syntax error")) {
        return fallbackMessage;
      }
      return "Transaksi belum bisa diproses. Coba lagi sebentar.";
  }
}

/**
 * Formats a successful cancellation response with accounting impact.
 */
export function formatCancelSuccess(
  result: CancelResultDTO,
  acctDetails?: { cogs?: number; grossProfit?: number }
): string {
  const amountFormatted = formatRupiah(result.totalAmount);
  let text =
    `Transaksi terakhir berhasil dibatalkan.\n\n` +
    `Dibatalkan: ${result.quantity} ${result.unit} (${amountFormatted})`;

  if (acctDetails) {
    text +=
      `\n\nDampak Pembukuan:\n` +
      `• Omzet: -${amountFormatted}\n` +
      `• HPP: -${formatRupiah(acctDetails.cogs || 0)}\n` +
      `• Laba Kotor: -${formatRupiah(acctDetails.grossProfit || 0)}\n` +
      `• Kas/Piutang dikembalikan\n` +
      `• Persediaan dipulihkan`;
  }
  return text;
}

/**
 * Formats a successful transaction correction response.
 */
export function formatCorrectSuccess(result: CorrectResultDTO): string {
  const newAmountFormatted = formatRupiah(result.newTotalAmount);
  return (
    `Transaksi terakhir berhasil dikoreksi dari ${result.originalQuantity} ${result.unit} ` +
    `menjadi ${result.newQuantity} ${result.unit}.\n` +
    `Total baru: *${newAmountFormatted}*`
  );
}

/**
 * Formats confirmation inquiry for ambiguous sales.
 */
export function formatConfirmationInquiry(parsed: ParsedMessage): string {
  if (parsed.multipleQuantitiesDetected) {
    return (
      `⚠️ Terdeteksi beberapa angka berat dalam satu pesan.\n` +
      `Demi ketepatan buku kas, mohon kirimkan satu transaksi per pesan atau konfirmasi jumlah yang ingin dicatat.`
    );
  }

  const qty = parsed.rawQuantity ?? parsed.quantity ?? "";
  return (
    `Saya membaca kemungkinan penjualan *${qty} kg*.\n` +
    `Apakah transaksi ini ingin dicatat ke buku kas? (Balas: Ya / Batal)`
  );
}

/**
 * Formats successful expense recording response.
 */
export function formatExpenseSuccess(params: {
  category: string;
  amount: number;
  description: string;
}): string {
  const amountFormatted = formatRupiah(params.amount);
  return (
    `✅ Pengeluaran dicatat\n\n` +
    `Kategori: ${params.category}\n` +
    `Jumlah: ${amountFormatted}\n` +
    `Keterangan: ${params.description}\n\n` +
    `Dicatat ke akun beban operasional dan mengurangi saldo kas.`
  );
}

/**
 * Formats successful capital contribution or owner draw response.
 */
export function formatCapitalSuccess(params: {
  type: "CAPITAL_ADDITION" | "OWNER_DRAW";
  amount: number;
  description?: string;
}): string {
  const amountFormatted = formatRupiah(params.amount);
  if (params.type === "CAPITAL_ADDITION") {
    return (
      `✅ Setoran modal dicatat\n\n` +
      `Jumlah: ${amountFormatted}\n\n` +
      `Saldo kas bertambah dan ekuitas modal pemilik bertambah.`
    );
  } else {
    return (
      `✅ Penarikan prive dicatat\n\n` +
      `Jumlah: ${amountFormatted}\n\n` +
      `Saldo kas berkurang dan ekuitas modal pemilik berkurang (tidak mempengaruhi laba/rugi).`
    );
  }
}

/**
 * Formats successful purchase recording response.
 */
export function formatPurchaseSuccess(params: {
  amount: number;
  itemName?: string;
  quantity?: number;
  unit?: string;
}): string {
  const amountFormatted = formatRupiah(params.amount);
  const itemInfo = params.itemName
    ? `\nBarang: ${params.itemName}${params.quantity ? ` (${params.quantity} ${params.unit || "kg"})` : ""}`
    : "";
  return (
    `✅ Pembelian dicatat\n` +
    itemInfo +
    `\nTotal: ${amountFormatted}\n\n` +
    `Persediaan bertambah dan saldo kas berkurang.`
  );
}

/**
 * Formats successful customer receivable collection response.
 */
export function formatReceivablePaymentSuccess(params: {
  customerName: string;
  amount: number;
}): string {
  const amountFormatted = formatRupiah(params.amount);
  return (
    `✅ Penerimaan piutang dicatat\n\n` +
    `Pelanggan: ${params.customerName}\n` +
    `Jumlah: ${amountFormatted}\n\n` +
    `Saldo kas bertambah dan piutang usaha berkurang.`
  );
}

/**
 * Formats successful supplier payable payment response.
 */
export function formatPayablePaymentSuccess(params: {
  supplierName: string;
  amount: number;
}): string {
  const amountFormatted = formatRupiah(params.amount);
  return (
    `✅ Pembayaran hutang dicatat\n\n` +
    `Supplier: ${params.supplierName}\n` +
    `Jumlah: ${amountFormatted}\n\n` +
    `Saldo kas berkurang dan hutang usaha berkurang.`
  );
}

/**
 * Formats cash & bank liquid balances.
 */
export function formatCashBalance(params: {
  cash: number;
  bank: number;
  totalLiquidity: number;
}): string {
  return (
    `💰 Saldo Kas & Bank\n\n` +
    `Kas Tunai: ${formatRupiah(params.cash)}\n` +
    `Bank: ${formatRupiah(params.bank)}\n` +
    `────────────────────\n` +
    `Total Likuiditas: ${formatRupiah(params.totalLiquidity)}`
  );
}

/**
 * Formats profit & loss report summary.
 */
export function formatProfitLossSummary(params: {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  periodLabel: string;
}): string {
  return (
    `📈 Laporan Laba Rugi (${params.periodLabel})\n\n` +
    `Omzet (Pendapatan): ${formatRupiah(params.revenue)}\n` +
    `HPP (Harga Pokok): ${formatRupiah(params.cogs)}\n` +
    `Laba Kotor: ${formatRupiah(params.grossProfit)}\n` +
    `Beban Operasional: ${formatRupiah(params.expenses)}\n` +
    `────────────────────\n` +
    `Laba Bersih: ${formatRupiah(params.netProfit)}`
  );
}

/**
 * Formats balance sheet summary.
 */
export function formatBalanceSheetSummary(params: {
  assets: number;
  liabilities: number;
  equity: number;
  isBalanced: boolean;
}): string {
  return (
    `🏛️ Neraca Keuangan\n\n` +
    `Total Aset: ${formatRupiah(params.assets)}\n` +
    `Total Kewajiban (Hutang): ${formatRupiah(params.liabilities)}\n` +
    `Total Ekuitas (Modal): ${formatRupiah(params.equity)}\n` +
    `────────────────────\n` +
    `Persamaan: Aset ${params.isBalanced ? "=" : "≠"} Hutang + Modal`
  );
}

/**
 * Formats cash flow statement summary.
 */
export function formatCashFlowSummary(params: {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netChange: number;
  endingCash: number;
}): string {
  return (
    `🌊 Laporan Arus Kas\n\n` +
    `Arus Kas Operasi: ${formatRupiah(params.operatingCashFlow)}\n` +
    `Arus Kas Investasi: ${formatRupiah(params.investingCashFlow)}\n` +
    `Arus Kas Pendanaan: ${formatRupiah(params.financingCashFlow)}\n` +
    `────────────────────\n` +
    `Kenaikan/Penurunan Kas: ${formatRupiah(params.netChange)}\n` +
    `Saldo Kas Akhir: ${formatRupiah(params.endingCash)}`
  );
}

/**
 * Formats clarification inquiry for ambiguous financial messages.
 */
export function formatAmbiguityInquiry(parsed: ParsedMessage): string {
  const amountStr = parsed.moneyAmount ? formatRupiah(parsed.moneyAmount) : "transaksi ini";
  if (parsed.normalizedText.includes("bayar")) {
    return (
      `Jumlah ${amountStr} ini untuk apa?\n\n` +
      `Pilihan:\n` +
      `1. Pengeluaran / Beban operasional (contoh: "Listrik 150rb", "Bayar bensin 50rb")\n` +
      `2. Pembayaran hutang supplier (contoh: "Bayar hutang supplier 2jt")\n` +
      `3. Pembelian persediaan (contoh: "Beli stok lele 100kg 2jt")`
    );
  }
  return (
    `Penerimaan ${amountStr} ini berasal dari apa?\n\n` +
    `Pilihan:\n` +
    `1. Penjualan barang (contoh: "Kejual lele 10kg")\n` +
    `2. Setoran modal pemilik (contoh: "Modal masuk 5jt")\n` +
    `3. Pelunasan piutang pelanggan (contoh: "Budi bayar hutang 1jt")`
  );
}
