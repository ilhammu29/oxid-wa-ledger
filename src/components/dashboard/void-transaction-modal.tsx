"use client";

import { useState } from "react";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import { voidTransactionAction } from "@/app/dashboard/actions";
import { TransactionRowData } from "./transaction-detail-modal";

interface VoidTransactionModalProps {
  transaction: TransactionRowData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function VoidTransactionModal({
  transaction,
  onClose,
  onSuccess,
}: VoidTransactionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan pembatalan wajib diisi untuk riwayat audit.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await voidTransactionAction(transaction.id, reason);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Gagal membatalkan transaksi.");
    } else {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-rose-500/5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Batalkan Transaksi Penjualan?
              </h3>
              <p className="text-[11px] text-muted">
                Pembalikan pembukuan (reversal journal) akan dicatat otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Details Summary */}
          <div className="p-3.5 rounded-xl bg-surface-hover/50 border border-border space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Produk:</span>
              <span className="font-semibold text-foreground">
                {transaction.product_name || "Produk Default"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Kuantitas:</span>
              <span className="font-mono text-foreground">
                {transaction.quantity} {transaction.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Penjualan:</span>
              <span className="font-mono font-bold text-foreground">
                Rp{new Intl.NumberFormat("id-ID").format(transaction.total_amount)}
              </span>
            </div>
          </div>

          {/* Audit Integrity Warning */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Integritas Akuntansi Terjamin</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-300">
              Transaksi tidak akan dihapus permanen. Sistem akan membuat jurnal pembalikan (debit/kredit terbalik), mengembalikan stok persediaan, dan mencatat riwayat audit.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Alasan Pembatalan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Pembeli batal beli, salah input kasir"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/30"
              autoFocus
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
            >
              Jangan Batalkan
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Memproses..." : "Batalkan Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
