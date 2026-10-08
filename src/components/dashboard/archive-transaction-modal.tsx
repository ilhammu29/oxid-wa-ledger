"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/modules/transactions/money";
import { archiveTransactionAction } from "@/app/dashboard/actions";
import { TransactionRowData } from "./transaction-detail-modal";
import { AlertCircle, Archive, Loader2, X } from "lucide-react";

interface ArchiveTransactionModalProps {
  transaction: TransactionRowData | null;
  onClose: () => void;
}

export function ArchiveTransactionModal({
  transaction,
  onClose,
}: ArchiveTransactionModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  async function handleArchive(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    setError(null);

    try {
      const res = await archiveTransactionAction(transaction.id, reason.trim());
      if (!res.success) {
        setError(res.error || "Gagal mengarsipkan transaksi.");
        return;
      }
      onClose();
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Terjadi kesalahan saat mengarsipkan transaksi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface rounded-xl border border-border shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Archive className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Hapus Transaksi?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleArchive} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Explanation Banner */}
          <div className="p-3.5 rounded-lg border border-border bg-surface-hover/30 text-xs text-muted space-y-2">
            <p className="font-medium text-foreground">
              Transaksi akan disembunyikan dari daftar transaksi aktif.
            </p>
            <p className="text-[11px] leading-relaxed">
              Seluruh data pembukuan, jurnal akuntansi double-entry, pergerakan stok, dan histori audit transaksi tetap aman dan tidak akan dihapus.
            </p>
          </div>

          {/* Transaction Summary Card */}
          <div className="rounded-lg border border-border bg-surface p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Produk:</span>
              <span className="font-semibold text-foreground">
                {transaction.product_name || "Produk Default"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Kuantitas:</span>
              <span className="font-mono text-foreground">
                {transaction.quantity} {transaction.unit}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1.5">
              <span className="text-muted font-medium">Total Transaksi:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {formatRupiah(transaction.total_amount)}
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Alasan Penghapusan <span className="text-muted font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kesalahan input manual, arsipkan baris"
              disabled={loading}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-medium transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Hapus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
