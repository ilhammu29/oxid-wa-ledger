/**
 * Extended Response Formatters for OXID WA Ledger.
 * Step 4: Deterministic human-friendly Indonesian output for domain execution results.
 */

import {
  SaleResultDTO,
  CancelResultDTO,
  CorrectResultDTO,
  ReportResultDTO,
} from "../transactions/types";
import { formatRupiah } from "../transactions/money";
import { ParsedMessage } from "../parser/types";

/**
 * Formats a successful sale transaction into clear Indonesian business copy.
 */
export function formatSaleSuccessResponse(sale: SaleResultDTO): string {
  const lineTotal = formatRupiah(sale.totalAmount);
  const unitPriceFormatted = formatRupiah(sale.unitPrice);
  const todayRevFormatted = formatRupiah(sale.todaySummary.totalRevenue);

  return (
    `✅ *Penjualan tercatat*\n\n` +
    `${sale.quantity} ${sale.unit} × ${unitPriceFormatted}\n` +
    `Total: *${lineTotal}*\n\n` +
    `*Hari ini:*\n` +
    `${sale.todaySummary.totalQuantity} ${sale.unit}\n` +
    `${todayRevFormatted} (${sale.todaySummary.transactionCount} transaksi)`
  );
}

/**
 * Formats a successful cancellation response.
 */
export function formatCancelSuccessResponse(result: CancelResultDTO): string {
  const amountFormatted = formatRupiah(result.totalAmount);
  return (
    `Transaksi terakhir berhasil dibatalkan.\n\n` +
    `Dibatalkan: ${result.quantity} ${result.unit} (${amountFormatted})`
  );
}

/**
 * Formats a successful transaction correction response.
 */
export function formatCorrectSuccessResponse(result: CorrectResultDTO): string {
  const newAmountFormatted = formatRupiah(result.newTotalAmount);
  return (
    `Transaksi terakhir berhasil dikoreksi dari ${result.originalQuantity} ${result.unit} ` +
    `menjadi ${result.newQuantity} ${result.unit}.\n` +
    `Total baru: *${newAmountFormatted}*`
  );
}

/**
 * Formats an aggregated sales report.
 */
export function formatReportResponse(report: ReportResultDTO): string {
  const periodTitle =
    report.period === "today"
      ? "Hari Ini"
      : report.period === "week"
      ? "Minggu Ini"
      : "Bulan Ini";

  const revenueFormatted = formatRupiah(report.totalRevenue);

  return (
    `📊 *Rekap Laporan ${periodTitle}*\n\n` +
    `• Transaksi: ${report.transactionCount}\n` +
    `• Total penjualan: ${report.totalQuantity} kg\n` +
    `• Total omzet: *${revenueFormatted}*`
  );
}

/**
 * Formats a confirmation inquiry when an ambiguous message is received.
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
