/**
 * Deterministic Indonesian Response Formatter for OXID WA Ledger.
 * Step 3: Pure response generation without LLMs.
 */

import { ParsedMessage, ConversationActionType } from "./types";

/**
 * Returns a human-friendly Indonesian response string corresponding to the action and parsed result.
 */
export function formatActionResponse(
  action: ConversationActionType,
  parsed: ParsedMessage
): string {
  switch (action) {
    case "CREATE_SALE": {
      const displayQty = parsed.rawQuantity ?? parsed.quantity ?? "0";
      return `Penjualan ${displayQty} kg terdeteksi dan siap dicatat.`;
    }

    case "ASK_CONFIRMATION": {
      if (parsed.multipleQuantitiesDetected) {
        return (
          `Saya mendeteksi beberapa jumlah berat dalam satu pesan. ` +
          `Mohon kirimkan satu transaksi per pesan atau konfirmasi jumlah yang benar.`
        );
      }
      const displayQty = parsed.rawQuantity ?? parsed.quantity ?? "";
      return `Saya membaca kemungkinan penjualan ${displayQty} kg. Apakah transaksi ini ingin dicatat? (Balas: Ya / Batal)`;
    }

    case "SHOW_REPORT_TODAY":
      return `Menampilkan rekap laporan penjualan hari ini...`;

    case "SHOW_REPORT_WEEK":
      return `Menampilkan rekap laporan penjualan minggu ini...`;

    case "SHOW_REPORT_MONTH":
      return `Menampilkan rekap laporan penjualan bulan ini...`;

    case "MARK_NO_SALE":
      return `Dicatat: Tidak ada penjualan untuk hari ini. Status harian telah diperbarui.`;

    case "MARK_CLOSED":
      return `Dicatat: Bisnis libur/tutup hari ini. Status operasional telah diperbarui.`;

    case "REQUEST_CANCEL_LAST":
      return `Permintaan pembatalan transaksi terakhir diterima.`;

    case "REQUEST_CORRECT_LAST": {
      const displayQty = parsed.rawCorrectedQuantity ?? parsed.correctedQuantity ?? "";
      return `Permintaan koreksi transaksi terakhir menjadi ${displayQty} kg diterima.`;
    }

    case "SHOW_HELP":
      return (
        `*Panduan Penggunaan OXID WA Ledger*\n\n` +
        `Anda dapat mencatat transaksi secara natural tanpa perintah kaku. Contoh format pesan:\n\n` +
        `• *Penjualan:* "Kejual 15kg", "Ada pembeli 7 kilo", "Jual 2,5 kg", "Tadi laku 20 kilogram"\n` +
        `• *Laporan:* "Laporan hari ini", "Laporan minggu ini", "Bulan ini omzet berapa?"\n` +
        `• *Status Harian:* "Gak ada penjualan hari ini", "Hari ini libur", "Tutup hari ini"\n` +
        `• *Koreksi/Batal:* "Batal terakhir", "Ubah terakhir jadi 20kg"\n` +
        `• *Bantuan:* "Help" atau "Cara pakai"`
      );

    case "SHOW_UNKNOWN_HELP":
    default:
      if (parsed.negativeKeywords.length > 0) {
        return `Pesan terdeteksi sebagai pencatatan stok/inventaris, bukan transaksi penjualan. Ketik 'help' untuk melihat format yang didukung.`;
      }
      return `Saya belum memahami pesan tersebut. Ketik 'help' untuk melihat contoh pesan yang dapat diproses sistem.`;
  }
}
