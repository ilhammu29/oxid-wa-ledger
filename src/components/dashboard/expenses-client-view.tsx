"use client";

import { useState } from "react";
import { formatRupiah } from "@/modules/transactions/money";
import { createExpenseAction, voidExpenseAction } from "@/app/dashboard/actions";
import { Plus, ArrowDownRight, Ban, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

export interface ExpenseRow {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
  payment_account: string | null;
  status: string;
  created_at?: string;
}

interface ExpensesClientViewProps {
  expenses: ExpenseRow[];
  timezone: string;
}

const CATEGORIES = [
  { value: "operasional", label: "Operasional Umum" },
  { value: "gaji", label: "Gaji & Upah Karyawan" },
  { value: "sewa", label: "Sewa Tempat & Bangunan" },
  { value: "listrik_air", label: "Listrik, Air & Utilitas" },
  { value: "pemasaran", label: "Pemasaran & Iklan" },
  { value: "pemeliharaan", label: "Pemeliharaan & Servis" },
  { value: "transportasi", label: "Transportasi & Bensin" },
  { value: "lainnya", label: "Beban Lain-lain" },
];

export function ExpensesClientView({ expenses }: ExpensesClientViewProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voidingExpense, setVoidingExpense] = useState<ExpenseRow | null>(null);

  // Form State
  const [category, setCategory] = useState("operasional");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [paymentAccount, setPaymentAccount] = useState<"kas" | "bank">("kas");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Void State
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  const rows = expenses || [];
  const activeRows = rows.filter((r) => r.status !== "voided" && r.status !== "cancelled");
  const totalExpense = activeRows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  // Group by category for active rows
  const categoryMap = new Map<string, number>();
  activeRows.forEach((r) => {
    const cat = r.category || "operasional";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (Number(r.amount) || 0));
  });
  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsedAmount = parseInt(amountStr.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError("Nominal pengeluaran harus lebih besar dari Rp 0.");
      return;
    }
    if (!description.trim()) {
      setFormError("Keterangan pengeluaran wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("category", category);
    fd.append("description", description.trim());
    fd.append("amount", parsedAmount.toString());
    fd.append("paymentAccount", paymentAccount);
    fd.append("expenseDate", expenseDate);

    try {
      const res = await createExpenseAction(fd);
      if (!res.success) {
        setFormError(res.error || "Gagal mencatat pengeluaran.");
      } else {
        setCreateModalOpen(false);
        setDescription("");
        setAmountStr("");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingExpense) return;
    setVoidError("");
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi untuk catatan audit.");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidExpenseAction(voidingExpense.id, voidReason.trim());
      if (!res.success) {
        setVoidError(res.error || "Gagal membatalkan pengeluaran.");
      } else {
        setVoidingExpense(null);
        setVoidReason("");
      }
    } catch (err: unknown) {
      setVoidError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pengeluaran & Beban Usaha
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Catatan beban operasional bisnis yang terhubung langsung ke buku besar dan arus kas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports/profit-loss"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Lihat Laba Rugi
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Beban</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Pengeluaran Aktif</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalExpense)}
          </p>
          <p className="text-[11px] text-muted mt-1">{activeRows.length} transaksi beban aktif</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs sm:col-span-2">
          <div className="text-xs text-muted mb-2 font-medium">Beban per Kategori Terbesar</div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 5).map(([cat, amt]) => (
              <div
                key={cat}
                className="px-2.5 py-1 rounded-md bg-surface-hover border border-border text-xs flex items-center gap-2"
              >
                <span className="font-medium capitalize text-foreground">{cat.replace("_", " ")}:</span>
                <span className="font-mono text-muted">{formatRupiah(amt)}</span>
              </div>
            ))}
            {categories.length === 0 && (
              <span className="text-xs text-muted">Belum ada kategori pengeluaran aktif.</span>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Riwayat Pengeluaran</h3>
          <span className="text-xs text-muted font-mono">{rows.length} data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3">Sumber Dana</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => {
                const isVoided = row.status === "voided" || row.status === "cancelled";
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-surface-hover/50 transition-colors ${
                      isVoided ? "opacity-60 bg-muted/5 line-through" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-muted whitespace-nowrap">{row.expense_date}</td>
                    <td className="px-4 py-3 font-medium capitalize text-foreground whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-surface-hover border border-border text-[11px]">
                        {row.category?.replace("_", " ") || "operasional"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/90 max-w-[250px] truncate">
                      {row.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted uppercase font-mono">{row.payment_account || "KAS"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      {formatRupiah(Number(row.amount))}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {isVoided ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Dibatalkan
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isVoided && (
                        <button
                          onClick={() => setVoidingExpense(row)}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                          title="Batalkan pengeluaran ini"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Batalkan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Belum ada data pengeluaran. Anda dapat mencatat lewat tombol di atas atau Telegram (contoh: &ldquo;Listrik 150 ribu&rdquo;).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE EXPENSE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Catat Beban / Pengeluaran</h3>
                  <p className="text-xs text-muted">Otomatis diposting ke Jurnal Umum & Arus Kas.</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Kategori Beban</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Keterangan / Keperluan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Token listrik toko 100 kWh"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nominal (Rp)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 150000"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmountStr(val ? parseInt(val, 10).toLocaleString("id-ID") : "");
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Sumber Dana</label>
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

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
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
                  <span>Simpan Pengeluaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID EXPENSE MODAL */}
      {voidingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-semibold text-foreground">Batalkan Pengeluaran</h3>
              </div>
              <button
                onClick={() => setVoidingExpense(null)}
                className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-foreground space-y-1">
              <p className="font-semibold text-rose-600 dark:text-rose-400">
                Perhatian: Aksi Accounting Reversal
              </p>
              <p className="text-muted text-[11px] leading-relaxed">
                Pengeluaran <span className="font-semibold text-foreground">{formatRupiah(Number(voidingExpense.amount))}</span> ({voidingExpense.description || voidingExpense.category}) tidak akan dihapus fisik dari database. Sistem akan membuat jurnal pembalik (reversal) secara otomatis agar pembukuan tetap seimbang.
              </p>
            </div>

            {voidError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{voidError}</span>
              </div>
            )}

            <form onSubmit={handleVoidSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Salah input nominal atau transaksi dibatalkan vendor"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setVoidingExpense(null)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-surface-hover"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isVoiding}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  {isVoiding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Batalkan Pengeluaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
