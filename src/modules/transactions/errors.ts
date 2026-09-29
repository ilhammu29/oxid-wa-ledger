/**
 * Typed Domain Errors for OXID WA Ledger.
 * Step 4: Prevents raw database errors from leaking to user responses.
 */

export type DomainErrorCode =
  | "BUSINESS_NOT_FOUND"
  | "BUSINESS_INACTIVE"
  | "DEFAULT_PRODUCT_NOT_CONFIGURED"
  | "UNIT_MISMATCH"
  | "INVALID_QUANTITY"
  | "CONFIRMATION_REQUIRED"
  | "NO_TRANSACTION_TO_CANCEL"
  | "NO_TRANSACTION_TO_CORRECT"
  | "DAILY_STATUS_CONFLICT"
  | "TRANSACTION_ALREADY_CANCELLED"
  | "TRANSACTION_ALREADY_CORRECTED"
  | "DATABASE_OPERATION_FAILED"
  | "UNAUTHORIZED";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly userMessage: string;
  public readonly details?: unknown;

  constructor(code: DomainErrorCode, message: string, userMessage?: string, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.userMessage = userMessage || getUserFriendlyErrorMessage(code);
    this.details = details;
  }
}

/**
 * Returns clean Indonesian user-facing explanations for domain errors.
 */
export function getUserFriendlyErrorMessage(code: DomainErrorCode): string {
  switch (code) {
    case "BUSINESS_NOT_FOUND":
      return "Bisnis tidak ditemukan atau belum terdaftar.";
    case "BUSINESS_INACTIVE":
      return "Akun bisnis sedang tidak aktif atau ditangguhkan.";
    case "DEFAULT_PRODUCT_NOT_CONFIGURED":
      return "Produk utama bisnis belum diatur dalam sistem. Hubungi admin untuk mengatur produk.";
    case "UNIT_MISMATCH":
      return "Satuan unit transaksi tidak cocok dengan konfigurasi produk.";
    case "INVALID_QUANTITY":
      return "Jumlah berat tidak valid. Berat harus bernilai lebih dari 0.";
    case "CONFIRMATION_REQUIRED":
      return "Transaksi memerlukan konfirmasi sebelum dapat dicatat.";
    case "NO_TRANSACTION_TO_CANCEL":
      return "Tidak ada transaksi aktif yang dapat dibatalkan.";
    case "NO_TRANSACTION_TO_CORRECT":
      return "Tidak ada transaksi aktif yang dapat dikoreksi.";
    case "DAILY_STATUS_CONFLICT":
      return "Status harian bertentangan dengan status yang sudah dicatat sebelumnya.";
    case "TRANSACTION_ALREADY_CANCELLED":
      return "Transaksi ini sudah dibatalkan sebelumnya.";
    case "TRANSACTION_ALREADY_CORRECTED":
      return "Transaksi ini sudah dikoreksi sebelumnya.";
    case "UNAUTHORIZED":
      return "Anda tidak memiliki izin untuk melakukan aksi pada bisnis ini.";
    case "DATABASE_OPERATION_FAILED":
    default:
      return "Terjadi kendala saat memproses data. Silakan coba kembali sesaat lagi.";
  }
}
