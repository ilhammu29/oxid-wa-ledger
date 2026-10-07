import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchasesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, purchase_date, item_name, quantity, unit, unit_cost, total_amount, is_credit, supplier_name, created_at")
    .eq("business_id", business.id)
    .order("purchase_date", { ascending: false });

  const rows = purchases || [];
  const totalPurchases = rows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const creditPurchases = rows.filter((r) => r.is_credit).reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const cashPurchases = totalPurchases - creditPurchases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pembelian Persediaan & Bahan
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Riwayat pengadaan stok barang dagangan dan pencatatan hutang/kas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/accounting/inventory"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Lihat Stok Persediaan
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Pembelian</span>
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalPurchases)}
          </p>
          <p className="text-[11px] text-muted mt-1">{rows.length} transaksi pembelian</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted">{row.purchase_date}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{row.item_name}</td>
                  <td className="px-4 py-3 font-mono text-foreground">
                    {row.quantity} {row.unit}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.supplier_name || "Pemasok Umum"}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {formatRupiah(Number(row.total_amount))}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Belum ada data pembelian stok. Kirim pesan Telegram (contoh: &ldquo;Beli stok lele 100kg 2 juta&rdquo;).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
