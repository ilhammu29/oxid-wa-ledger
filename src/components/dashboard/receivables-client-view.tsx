"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/modules/transactions/money";
import { recordReceivablePaymentAction } from "@/app/dashboard/actions";
import { Users, CheckCircle, Clock, Banknote, Loader2, AlertTriangle, X } from "lucide-react";

export interface ReceivableRow {
  id: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  due_date: string | null;
  created_at?: string;
}

interface ReceivablesClientViewProps {
  receivables: ReceivableRow[];
  timezone: string;
}

export function ReceivablesClientView({ receivables }: ReceivablesClientViewProps) {
  const router = useRouter();
  const [payingReceivable, setPayingReceivable] = useState<ReceivableRow | null>(null);

  // Form State
  const [payAmountStr, setPayAmountStr] = useState("");
  const [paymentAccount, setPaymentAccount] = useState<"kas" | "bank">("kas");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const rows = receivables || [];
  const totalReceivables = rows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const totalPaid = rows.reduce((acc, row) => acc + (Number(row.paid_amount) || 0), 0);
  const totalOutstanding = totalReceivables - totalPaid;

  const openPaymentModal = (rec: ReceivableRow) => {
    setPayingReceivable(rec);
    const remaining = Number(rec.total_amount) - Number(rec.paid_amount);
    setPayAmountStr(remaining > 0 ? remaining.toLocaleString("id-ID") : "");
    setNotes(`Pelunasan tagihan ${rec.customer_name}`);
    setFormError("");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingReceivable) return;
    setFormError("");

    const parsedAmount = parseInt(payAmountStr.replace(/\D/g, ""), 10);
    const remaining = Number(payingReceivable.total_amount) - Number(payingReceivable.paid_amount);

    if (!parsedAmount || parsedAmount <= 0) {
      setFormError("Nominal pembayaran harus lebih besar dari Rp 0.");
      return;
    }
    if (parsedAmount > remaining) {
      setFormError(`Nominal pembayaran melebihi sisa piutang (${formatRupiah(remaining)}).`);
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("receivableId", payingReceivable.id);
    fd.append("amount", parsedAmount.toString());
    fd.append("paymentAccount", paymentAccount);
    fd.append("paymentDate", paymentDate);
    fd.append("notes", notes.trim());

    try {
      const res = await recordReceivablePaymentAction(fd);
      if (!res.success) {
        setFormError(res.error || "Gagal mencatat pelunasan piutang.");
      } else {
        router.refresh();
        setPayingReceivable(null);
        setPayAmountStr("");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Piutang Usaha (Tagihan Pelanggan)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Daftar tagihan penjualan tempo, status pembayaran, dan saldo outstanding pelanggan.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Piutang Diberikan</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalReceivables)}
          </p>
          <p className="text-[11px] text-muted mt-1">Akumulasi seluruh transaksi tempo</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Sisa Tagihan (Outstanding)</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {formatRupiah(totalOutstanding)}
          </p>
          <p className="text-[11px] text-muted mt-1">Belum dilunasi oleh pelanggan</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Sudah Diterima (Lunas)</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {formatRupiah(totalPaid)}
          </p>
          <p className="text-[11px] text-muted mt-1">Telah masuk kas / bank</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Piutang Pelanggan</h3>
          <span className="text-xs text-muted font-mono">{rows.length} pelanggan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Total Tagihan</th>
                <th className="px-4 py-3">Sudah Dibayar</th>
                <th className="px-4 py-3">Sisa Piutang</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => {
                const total = Number(row.total_amount) || 0;
                const paid = Number(row.paid_amount) || 0;
                const rem = total - paid;
                const isPaid = row.status === "paid" || rem <= 0;

                return (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.customer_name}</td>
                    <td className="px-4 py-3 font-mono text-muted whitespace-nowrap">{formatRupiah(total)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {formatRupiah(paid)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground whitespace-nowrap">
                      {formatRupiah(rem)}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted whitespace-nowrap">{row.due_date || "-"}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          isPaid
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : paid > 0
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {isPaid ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM BAYAR"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isPaid && (
                        <button
                          onClick={() => openPaymentModal(row)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                          title="Catat penerimaan pembayaran piutang"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Pelunasan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Tidak ada piutang outstanding saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD RECEIVABLE PAYMENT MODAL */}
      {payingReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Catat Pelunasan Piutang</h3>
                  <p className="text-xs text-muted">Menerima pembayaran dari {payingReceivable.customer_name}.</p>
                </div>
              </div>
              <button
                onClick={() => setPayingReceivable(null)}
                className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-surface-hover border border-border text-xs flex justify-between">
              <div>
                <span className="text-muted block text-[11px]">Sisa Piutang:</span>
                <span className="font-mono font-semibold text-foreground text-sm">
                  {formatRupiah(Number(payingReceivable.total_amount) - Number(payingReceivable.paid_amount))}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted block text-[11px]">Total Tagihan Awal:</span>
                <span className="font-mono text-muted text-xs">
                  {formatRupiah(Number(payingReceivable.total_amount))}
                </span>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Tanggal Terima</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Masuk Rekening</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as "kas" | "bank")}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="kas">Kas Tunai (1-1001)</option>
                    <option value="bank">Bank / Transfer (1-1002)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nominal Pelunasan (Rp)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 500000"
                  value={payAmountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPayAmountStr(val ? parseInt(val, 10).toLocaleString("id-ID") : "");
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Catatan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPayingReceivable(null)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-surface-hover"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
