"use client";

import { useState } from "react";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { correctTransactionAction } from "@/app/dashboard/actions";
import { TransactionRowData } from "./transaction-detail-modal";

interface EditTransactionModalProps {
  transaction: TransactionRowData | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditTransactionModal({
  transaction,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [newQtyStr, setNewQtyStr] = useState(
    transaction ? String(transaction.quantity) : ""
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const unitPrice = Number(transaction.unit_price) || 0;
  const oldTotal = Number(transaction.total_amount) || 0;
  const parsedQty = parseFloat(newQtyStr.replace(",", "."));
  const isValidQty = !isNaN(parsedQty) && parsedQty > 0;
  const newTotal = isValidQty ? Math.round(parsedQty * unitPrice) : 0;
  const diff = newTotal - oldTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidQty) {
      setError("Jumlah kuantitas harus lebih besar dari 0.");
      return;
    }
    if (!reason.trim()) {
      setError("Alasan koreksi wajib diisi untuk riwayat audit.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await correctTransactionAction(transaction.id, parsedQty, reason);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Gagal mengoreksi transaksi.");
    } else {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Koreksi Penjualan
              </h3>
              <p className="text-[11px] text-muted">
                Sistem akan membalik jurnal lama dan mencatat transaksi baru
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Info (Immutable Price) */}
          <div className="p-3 rounded-xl bg-surface-hover/40 border border-border space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Produk:</span>
              <span className="font-semibold text-foreground">
                {transaction.product_name || "Produk Default"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Harga Satuan (Terkunci):</span>
              <span className="font-mono font-medium text-foreground">
                Rp{new Intl.NumberFormat("id-ID").format(unitPrice)} / {transaction.unit}
              </span>
            </div>
          </div>

          {/* Input Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex justify-between">
              <span>Kuantitas Baru ({transaction.unit})</span>
              <span className="text-[11px] text-muted">Lama: {transaction.quantity} {transaction.unit}</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={newQtyStr}
              onChange={(e) => setNewQtyStr(e.target.value)}
              placeholder={`Contoh: 15 atau 2.5`}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              autoFocus
              required
            />
          </div>

          {/* Real-time Calculation Preview */}
          <div className="p-3 rounded-xl bg-surface border border-border space-y-2 text-xs">
            <div className="text-[11px] font-mono text-muted uppercase tracking-wider">
              Pratinjau Nilai Transaksi
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Lama:</span>
              <span className="font-mono text-muted line-through">
                Rp{new Intl.NumberFormat("id-ID").format(oldTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border">
              <span className="font-medium text-foreground">Total Baru:</span>
              <span className="font-mono font-bold text-base text-primary">
                Rp{new Intl.NumberFormat("id-ID").format(newTotal)}
              </span>
            </div>
            {isValidQty && diff !== 0 && (
              <div className="text-[11px] font-mono text-muted flex justify-between">
                <span>Penyesuaian:</span>
                <span className={diff > 0 ? "text-emerald-500" : "text-rose-500"}>
                  {diff > 0 ? "+" : ""}Rp{new Intl.NumberFormat("id-ID").format(diff)}
                </span>
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Alasan Koreksi <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Salah timbang, pembeli minta tambah 5kg"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              required
            />
            <p className="text-[10px] text-muted">
              Alasan disimpan permanen di riwayat audit dan tidak dapat dihapus.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-surface-hover transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !isValidQty || !reason.trim()}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-fg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? "Menyimpan..." : "Simpan Koreksi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
