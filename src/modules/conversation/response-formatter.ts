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
    `OXID Ledger siap digunakan. (Panduan Penggunaan)\n\n` +
    `Contoh pencatatan:\n` +
    `• Kejual lele 15kg\n` +
    `• Nila laku 5 kilo\n\n` +
    `Laporan:\n` +
    `• laporan hari ini\n` +
    `• minggu ini dapat berapa\n` +
    `• bulan ini omzet berapa\n\n` +
    `Koreksi:\n` +
    `• batal terakhir\n` +
    `• ubah terakhir jadi 20kg\n\n` +
    `Status:\n` +
    `• gak ada penjualan hari ini\n` +
    `• libur hari ini`;

  if (activeProducts && activeProducts.length > 0) {
    text += `\n\nProduk aktif:\n` + activeProducts.map((p) => `• ${p}`).join("\n");
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
 * Formats a successful cancellation response.
 */
export function formatCancelSuccess(result: CancelResultDTO): string {
  const amountFormatted = formatRupiah(result.totalAmount);
  return (
    `Transaksi terakhir berhasil dibatalkan.\n\n` +
    `Dibatalkan: ${result.quantity} ${result.unit} (${amountFormatted})`
  );
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
