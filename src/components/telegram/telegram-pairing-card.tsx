"use client";

import {
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useTelegramPairing, UseTelegramPairingOptions } from "./use-telegram-pairing";

export interface TelegramPairingCardProps extends UseTelegramPairingOptions {
  theme?: "light" | "dark";
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export function TelegramPairingCard({
  theme = "light",
  onCancel,
  showCancelButton = false,
  ...pairingOptions
}: TelegramPairingCardProps) {
  const {
    state,
    pairingCode,
    botUsername,
    deepLink,
    formattedCountdown,
    copied,
    errorMessage,
    generateNewCode,
    copyCode,
  } = useTelegramPairing(pairingOptions);

  const isDark = theme === "dark";

  return (
    <div className="space-y-4">
      {/* State: GENERATING */}
      {state === "GENERATING" && (
        <div className="py-10 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className={`text-xs font-semibold ${isDark ? "text-zinc-200" : "text-zinc-700"}`}>
            Menyiapkan kode koneksi Telegram...
          </p>
          <p className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
            Memverifikasi izin dan kuota paket usaha Anda.
          </p>
        </div>
      )}

      {/* State: ERROR */}
      {state === "ERROR" && (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-xs font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              Gagal Membuat Kode
            </h3>
            <p className="text-xs text-rose-500 px-4">
              {errorMessage || "Gagal membuat kode koneksi. Silakan coba lagi."}
            </p>
          </div>
          <div className="flex gap-2 pt-2 justify-center max-w-xs mx-auto">
            {showCancelButton && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors min-h-[44px] ${
                  isDark
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={generateNewCode}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold min-h-[44px] shadow-sm transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {/* State: CONSUMED / PAIRED */}
      {state === "CONSUMED" && (
        <div className="py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-base font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              Telegram Berhasil Terhubung!
            </h3>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Akun operator telah resmi aktif dan siap mencatat transaksi.
            </p>
          </div>
        </div>
      )}

      {/* State: EXPIRED */}
      {state === "EXPIRED" && (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              Kode Koneksi Kedaluwarsa
            </h3>
            <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Kode koneksi berlaku 10 menit demi keamanan akun bisnis Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={generateNewCode}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[44px] shadow-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Buat Kode Baru</span>
          </button>
        </div>
      )}

      {/* State: ACTIVE */}
      {state === "ACTIVE" && (
        <div className="space-y-4">
          {/* Pairing Code Box */}
          <div
            className={`p-4 rounded-2xl text-center space-y-2 border shadow-inner ${
              isDark
                ? "bg-zinc-950 text-white border-zinc-800"
                : "bg-zinc-900 text-white border-zinc-800"
            }`}
          >
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Kode Koneksi Anda
            </p>
            <div className="font-mono text-3xl font-extrabold text-emerald-400 tracking-wider">
              {pairingCode}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 pt-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Berlaku selama:</span>
              <span className="font-mono font-bold text-amber-400">{formattedCountdown}</span>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div
            className={`space-y-2.5 text-xs p-4 rounded-2xl border ${
              isDark
                ? "bg-zinc-950/70 border-zinc-800 text-zinc-300"
                : "bg-zinc-50 border-zinc-200/80 text-zinc-700"
            }`}
          >
            <p className={`font-semibold ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
              Cara Menghubungkan:
            </p>
            <ol className={`space-y-2 list-decimal list-inside pl-1 ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
              <li>
                Buka bot resmi{" "}
                <strong className={`font-mono ${isDark ? "text-zinc-100" : "text-zinc-900"}`}>
                  @{botUsername}
                </strong>{" "}
                di Telegram.
              </li>
              <li>
                Kirim perintah berikut ke bot:
                <div
                  className={`mt-1 font-mono px-2.5 py-1.5 rounded-lg text-xs font-bold inline-block border ${
                    isDark
                      ? "bg-zinc-900 text-emerald-400 border-zinc-800"
                      : "bg-white text-zinc-900 border-zinc-200"
                  }`}
                >
                  /connect {pairingCode}
                </div>
              </li>
              <li>Atau tekan tombol buka Telegram di bawah.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={copyCode}
              className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
                isDark
                  ? "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                  : "border-zinc-300 hover:bg-zinc-50 text-zinc-800"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-400" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>

            <a
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors min-h-[44px] shadow-sm text-center"
            >
              <span>Buka Telegram</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Live Polling Status */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDark
                ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                : "bg-emerald-50/60 border-emerald-100 text-emerald-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
              <span className="text-[11px] font-medium">Menunggu Anda mengirim kode...</span>
            </div>
            <button
              type="button"
              onClick={generateNewCode}
              className="text-[11px] font-semibold text-emerald-500 hover:underline ml-2"
            >
              Ganti Kode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
