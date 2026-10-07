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
        `• *Pengeluaran:* "Listrik 150 ribu", "Bayar bensin 50 ribu"\n` +
        `• *Modal & Prive:* "Modal masuk 5 juta", "Ambil uang usaha 500 ribu"\n` +
        `• *Pembelian:* "Beli stok lele 100kg 2 juta"\n` +
        `• *Piutang/Hutang:* "Budi bayar hutang 1 juta", "Bayar hutang supplier 2 juta"\n` +
        `• *Laporan:* "Laporan hari ini", "Laba bulan ini", "Neraca bulan ini", "Saldo kas"\n` +
        `• *Export Excel:* "Export laporan bulan ini"\n` +
        `• *Status Harian:* "Gak ada penjualan hari ini", "Hari ini libur", "Tutup hari ini"\n` +
        `• *Koreksi/Batal:* "Batal terakhir", "Ubah terakhir jadi 20kg"\n` +
        `• *Bantuan:* "Help" atau "Cara pakai"`
      );

    case "RECORD_EXPENSE":
      return `Mencatat pengeluaran...`;

    case "RECORD_CAPITAL_IN":
      return `Mencatat setoran modal...`;

    case "RECORD_OWNER_DRAW":
      return `Mencatat penarikan prive...`;

    case "RECORD_PURCHASE":
      return `Mencatat pembelian persediaan...`;

    case "RECORD_PAY_RECEIVABLE":
      return `Mencatat pelunasan piutang...`;

    case "RECORD_PAY_PAYABLE":
      return `Mencatat pembayaran hutang...`;

    case "SHOW_CASH_BALANCE":
      return `Menyiapkan saldo kas & bank...`;

    case "SHOW_PROFIT_LOSS":
      return `Menyiapkan laporan laba rugi...`;

    case "SHOW_BALANCE_SHEET":
      return `Menyiapkan neraca keuangan...`;

    case "SHOW_CASH_FLOW":
      return `Menyiapkan laporan arus kas...`;

    case "SHOW_TRIAL_BALANCE":
      return `Menyiapkan neraca saldo...`;

    case "SHOW_GENERAL_LEDGER":
      return `Menyiapkan buku besar...`;

    case "SHOW_INVENTORY_STATUS":
      return `Menyiapkan ringkasan persediaan...`;

    case "SHOW_RECEIVABLE_STATUS":
      return `Menyiapkan status piutang...`;

    case "SHOW_PAYABLE_STATUS":
      return `Menyiapkan status hutang...`;

    case "EXECUTE_EXPORT_REPORT":
      return `Menyiapkan berkas Excel laporan keuangan...`;

    case "ASK_AMBIGUITY_CLARIFICATION":
      return `Konfirmasi maksud transaksi diperlukan.`;

    case "SHOW_UNKNOWN_HELP":
    default:
      if (parsed.negativeKeywords.length > 0) {
        return `Pesan terdeteksi sebagai pencatatan stok/inventaris, bukan transaksi penjualan. Ketik 'help' untuk melihat format yang didukung.`;
      }
      return `Saya belum memahami pesan tersebut. Ketik 'help' untuk melihat contoh pesan yang dapat diproses sistem.`;
  }
}
