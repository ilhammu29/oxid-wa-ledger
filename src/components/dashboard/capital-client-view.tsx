"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/modules/transactions/money";
import { createCapitalMovementAction, voidCapitalMovementAction } from "@/app/dashboard/actions";
import { Plus, Coins, ArrowDownLeft, ArrowUpRight, TrendingUp, Ban, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

export interface CapitalMovementRow {
  id: string;
  movement_date: string;
  type: "CAPITAL_ADDITION" | "OWNER_DRAW";
  amount: number;
  description: string | null;
  status?: string;
  created_at?: string;
}

interface CapitalClientViewProps {
  movements: CapitalMovementRow[];
  equity: {
    beginningEquity: number;
    capitalAdditions: number;
    ownerDraws: number;
    netProfit: number;
    endingEquity: number;
  };
  timezone: string;
}

export function CapitalClientView({ movements, equity }: CapitalClientViewProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voidingMovement, setVoidingMovement] = useState<CapitalMovementRow | null>(null);

  // Form State
  const [movementType, setMovementType] = useState<"CAPITAL_ADDITION" | "OWNER_DRAW">("CAPITAL_ADDITION");
  const [amountStr, setAmountStr] = useState("");
  const [paymentAccount, setPaymentAccount] = useState<"kas" | "bank">("kas");
  const [movementDate, setMovementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Void State
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  const rows = movements || [];

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsedAmount = parseInt(amountStr.replace(/\D/g, ""), 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError("Nominal mutasi modal/prive harus lebih besar dari Rp 0.");
      return;
    }
    if (!description.trim()) {
      setFormError("Keterangan mutasi wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("type", movementType);
    fd.append("amount", parsedAmount.toString());
    fd.append("paymentAccount", paymentAccount);
    fd.append("movementDate", movementDate);
    fd.append("description", description.trim());

    try {
      const res = await createCapitalMovementAction(fd);
      if (!res.success) {
        setFormError(res.error || "Gagal mencatat mutasi modal.");
      } else {
        router.refresh();
        setCreateModalOpen(false);
        setAmountStr("");
        setDescription("");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingMovement) return;
    setVoidError("");
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi untuk catatan audit.");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidCapitalMovementAction(voidingMovement.id, voidReason.trim());
      if (!res.success) {
        setVoidError(res.error || "Gagal membatalkan mutasi.");
      } else {
        router.refresh();
        setVoidingMovement(null);
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
            Modal Pemilik & Prive
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Rekapitulasi penyetoran modal usaha, penarikan prive pribadi, dan perubahan ekuitas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports/equity"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Laporan Ekuitas
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Modal / Prive</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Modal Masuk</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(equity.capitalAdditions)}
          </p>
          <p className="text-[11px] text-muted mt-1">Setoran modal pemilik</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Penarikan Prive</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(equity.ownerDraws)}
          </p>
          <p className="text-[11px] text-muted mt-1">Penarikan untuk pribadi</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Laba Periode Berjalan</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(equity.netProfit)}
          </p>
          <p className="text-[11px] text-muted mt-1">Laba bersih tahun ini</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Ekuitas Akhir</span>
            <Coins className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(equity.endingEquity)}
          </p>
          <p className="text-[11px] text-muted mt-1">Nilai bersih modal usaha</p>
        </div>
      </div>

      {/* Movement Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Riwayat Mutasi Modal & Prive</h3>
          <span className="text-xs text-muted font-mono">{rows.length} mutasi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Jenis Mutasi</th>
                <th className="px-4 py-3">Keterangan</th>
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
                    <td className="px-4 py-3 font-mono text-muted whitespace-nowrap">{row.movement_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          row.type === "CAPITAL_ADDITION"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {row.type === "CAPITAL_ADDITION" ? "SETORAN MODAL" : "PENARIKAN PRIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground/90 max-w-[300px] truncate">
                      {row.description || "-"}
                    </td>
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
                          onClick={() => setVoidingMovement(row)}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                          title="Batalkan mutasi ini"
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Belum ada data pergerakan modal atau prive. Catat menggunakan tombol di atas atau via Telegram (contoh: &ldquo;Modal masuk 5 juta&rdquo; atau &ldquo;Prive 500 ribu&rdquo;).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CAPITAL MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Catat Modal / Prive</h3>
                  <p className="text-xs text-muted">Menambah modal disetor atau penarikan keperluan pribadi.</p>
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
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementType("CAPITAL_ADDITION")}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                      movementType === "CAPITAL_ADDITION"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "bg-surface text-muted border-border hover:bg-surface-hover"
                    }`}
                  >
                    + Setoran Modal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementType("OWNER_DRAW")}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-colors ${
                      movementType === "OWNER_DRAW"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                        : "bg-surface text-muted border-border hover:bg-surface-hover"
                    }`}
                  >
                    - Penarikan Prive
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={movementDate}
                    onChange={(e) => setMovementDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Rekening Kas / Bank</label>
                  <select
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value as "kas" | "bank")}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="kas">Kas Tunai (1-1001)</option>
                    <option value="bank">Rekening Bank (1-1002)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nominal (Rp)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 5000000"
                  value={amountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setAmountStr(val ? parseInt(val, 10).toLocaleString("id-ID") : "");
                  }}
                  className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Keterangan</label>
                <input
                  type="text"
                  required
                  placeholder={
                    movementType === "CAPITAL_ADDITION"
                      ? "Contoh: Tambahan modal kerja awal bulan"
                      : "Contoh: Keperluan pribadi pemilik toko"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary"
                />
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
                  <span>Simpan Mutasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID CAPITAL MODAL */}
      {voidingMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-semibold text-foreground">Batalkan Mutasi Modal / Prive</h3>
              </div>
              <button
                onClick={() => setVoidingMovement(null)}
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
                Mutasi <span className="font-semibold text-foreground">{voidingMovement.type === "CAPITAL_ADDITION" ? "Setoran Modal" : "Penarikan Prive"}</span> senilai <span className="font-semibold text-foreground">{formatRupiah(Number(voidingMovement.amount))}</span> ({voidingMovement.description}) akan dibatalkan melalui jurnal pembalik. Saldo kas/bank dan ekuitas akan dipulihkan secara proporsional.
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
                  placeholder="Contoh: Salah input jumlah setoran modal"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setVoidingMovement(null)}
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
                  <span>Batalkan Mutasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
