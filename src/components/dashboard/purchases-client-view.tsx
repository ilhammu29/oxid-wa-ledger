"use client";

import { useState } from "react";
import { formatRupiah } from "@/modules/transactions/money";
import { createPurchaseAction, voidPurchaseAction } from "@/app/dashboard/actions";
import { Plus, ShoppingCart, Ban, Loader2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

export interface PurchaseRow {
  id: string;
  purchase_date: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_amount: number;
  is_credit: boolean;
  supplier_name: string | null;
  status?: string;
  created_at?: string;
}

interface PurchasesClientViewProps {
  purchases: PurchaseRow[];
  timezone: string;
}

export function PurchasesClientView({ purchases }: PurchasesClientViewProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voidingPurchase, setVoidingPurchase] = useState<PurchaseRow | null>(null);

  // Form State
  const [itemName, setItemName] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [unit, setUnit] = useState("kg");
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [paymentType, setPaymentType] = useState<"kas" | "bank" | "credit">("kas");
  const [supplierName, setSupplierName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Void State
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  const rows = purchases || [];
  const activeRows = rows.filter((r) => r.status !== "voided" && r.status !== "cancelled");
  const totalPurchases = activeRows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const creditPurchases = activeRows.filter((r) => r.is_credit).reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const cashPurchases = totalPurchases - creditPurchases;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsedQty = parseFloat(quantityStr.replace(",", "."));
    const parsedTotal = parseInt(totalAmountStr.replace(/\D/g, ""), 10);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFormError("Jumlah (kuantitas) harus lebih besar dari 0.");
      return;
    }
    if (!parsedTotal || parsedTotal <= 0) {
      setFormError("Total biaya pembelian harus lebih besar dari Rp 0.");
      return;
    }
    if (!itemName.trim()) {
      setFormError("Nama barang / bahan wajib diisi.");
      return;
    }

    const unitCost = Math.round(parsedTotal / parsedQty);

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("itemName", itemName.trim());
    fd.append("quantity", parsedQty.toString());
    fd.append("unit", unit.trim());
    fd.append("unitCost", unitCost.toString());
    fd.append("totalAmount", parsedTotal.toString());
    fd.append("isCredit", paymentType === "credit" ? "true" : "false");
    fd.append("paymentAccount", paymentType === "bank" ? "bank" : "kas");
    fd.append("supplierName", supplierName.trim() || "Pemasok Umum");
    fd.append("purchaseDate", purchaseDate);

    try {
      const res = await createPurchaseAction(fd);
      if (!res.success) {
        setFormError(res.error || "Gagal mencatat pembelian.");
      } else {
        setCreateModalOpen(false);
        setItemName("");
        setQuantityStr("");
        setTotalAmountStr("");
        setSupplierName("");
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingPurchase) return;
    setVoidError("");
    if (!voidReason.trim()) {
      setVoidError("Alasan pembatalan wajib diisi untuk catatan audit.");
      return;
    }

    setIsVoiding(true);
    try {
      const res = await voidPurchaseAction(voidingPurchase.id, voidReason.trim());
      if (!res.success) {
        setVoidError(res.error || "Gagal membatalkan pembelian.");
      } else {
        setVoidingPurchase(null);
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
            Pembelian Persediaan & Bahan
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Riwayat pengadaan stok barang dagangan dan pencatatan kas/hutang usaha.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/accounting/inventory"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Lihat Stok Persediaan
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Pembelian</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Pembelian Aktif</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalPurchases)}
          </p>
          <p className="text-[11px] text-muted mt-1">{activeRows.length} transaksi pembelian</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="text-xs text-muted">Pembelian Tunai (Kas Keluar)</div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(cashPurchases)}
          </p>
          <p className="text-[11px] text-muted mt-1">Dibayar lunas langsung</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="text-xs text-muted">Pembelian Kredit (Masuk Hutang)</div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {formatRupiah(creditPurchases)}
          </p>
          <p className="text-[11px] text-muted mt-1">Dicatat ke akun Hutang Usaha</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Transaksi Pembelian</h3>
          <span className="text-xs text-muted font-mono">{rows.length} data</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Barang / Item</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3 text-right">Total</th>
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
                    <td className="px-4 py-3 font-mono text-muted whitespace-nowrap">{row.purchase_date}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{row.item_name}</td>
                    <td className="px-4 py-3 font-mono text-foreground whitespace-nowrap">
                      {row.quantity} {row.unit}
                    </td>
                    <td className="px-4 py-3 text-muted">{row.supplier_name || "Pemasok Umum"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          row.is_credit
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {row.is_credit ? "KREDIT" : "TUNAI"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      {formatRupiah(Number(row.total_amount))}
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
                          onClick={() => setVoidingPurchase(row)}
                          className="inline-flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                          title="Batalkan pembelian ini"
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
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    Belum ada data pembelian stok. Gunakan tombol &ldquo;Catat Pembelian&rdquo; di atas atau kirim Telegram (contoh: &ldquo;Beli stok lele 100kg 2 juta&rdquo;).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Catat Pembelian Stok / Bahan</h3>
                  <p className="text-xs text-muted">Menambah persediaan dan mencatat pengeluaran/hutang.</p>
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
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Nama Barang / Bahan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lele Segar"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Jumlah (Kuantitas)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 100"
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Satuan</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="pcs">pcs (Buah/Porsi)</option>
                    <option value="zak">zak (Karung)</option>
                    <option value="box">box (Kardus)</option>
                    <option value="liter">liter</option>
                    <option value="ekor">ekor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Total Biaya (Rp)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2000000"
                    value={totalAmountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setTotalAmountStr(val ? parseInt(val, 10).toLocaleString("id-ID") : "");
                    }}
                    className="w-full px-3 py-2 text-xs font-mono font-medium rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Metode Bayar</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as "kas" | "bank" | "credit")}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="kas">Tunai Kas (1-1001)</option>
                    <option value="bank">Transfer Bank (1-1002)</option>
                    <option value="credit">Kredit Hutang (2-2001)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Nama Supplier / Pemasok (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Pemasok Lele Pak Budi"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
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
                  <span>Simpan Pembelian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID PURCHASE MODAL */}
      {voidingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-semibold text-foreground">Batalkan Pembelian Stok</h3>
              </div>
              <button
                onClick={() => setVoidingPurchase(null)}
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
                Pembelian <span className="font-semibold text-foreground">{voidingPurchase.item_name} ({voidingPurchase.quantity} {voidingPurchase.unit})</span> senilai <span className="font-semibold text-foreground">{formatRupiah(Number(voidingPurchase.total_amount))}</span> akan dibatalkan melalui jurnal pembalik. Jika pembelian secara kredit, saldo hutang terkait juga akan disesuaikan.
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
                  placeholder="Contoh: Barang retur atau salah input kuantitas"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setVoidingPurchase(null)}
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
                  <span>Batalkan Pembelian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
