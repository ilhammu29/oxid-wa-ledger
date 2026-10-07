import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import { Boxes, AlertTriangle, Layers } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const [productsRes, movementsRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, unit_cost, default_price, active")
      .eq("business_id", business.id)
      .order("name", { ascending: true }),
    supabase
      .from("inventory_movements")
      .select("product_id, quantity")
      .eq("business_id", business.id),
  ]);

  const stockByProductId = new Map<string, number>();
  (movementsRes.data || []).forEach((m: { product_id: string; quantity: number | string }) => {
    stockByProductId.set(
      m.product_id,
      (stockByProductId.get(m.product_id) || 0) + Number(m.quantity)
    );
  });

  const rows = (productsRes.data || []).map((p: {
    id: string;
    name: string;
    unit: string;
    unit_cost: number | string;
    default_price: number | string;
    active: boolean;
  }) => ({
    ...p,
    stock: stockByProductId.get(p.id) || 0,
  }));
  const totalItems = rows.length;
  const totalStockUnits = rows.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const totalValuation = rows.reduce((acc, p) => acc + (Number(p.stock) || 0) * (Number(p.unit_cost) || 0), 0);
  const lowStockCount = rows.filter((p) => (Number(p.stock) || 0) <= 5).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Persediaan & Stok Barang
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Status kuantitas fisik, harga pokok satuan (HPP), dan total nilai aset persediaan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/accounting/purchases"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Riwayat Pembelian
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Nilai Persediaan</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalValuation)}
          </p>
          <p className="text-[11px] text-muted mt-1">Masuk pos Aset Lancar (1400)</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Kuantitas Fisik</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {totalStockUnits} <span className="text-sm font-normal text-muted">unit/kg</span>
          </p>
          <p className="text-[11px] text-muted mt-1">Akumulasi seluruh komoditas</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Jenis Produk Aktif</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {totalItems}
          </p>
          <p className="text-[11px] text-muted mt-1">Katalog produk bisnis</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Stok Menipis (≤ 5)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2 tabular-nums">
            {lowStockCount}
          </p>
          <p className="text-[11px] text-muted mt-1">Perlu pengadaan kembali</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Produk & Valuasi Stok</h3>
          <span className="text-xs text-muted font-mono">{rows.length} komoditas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Nama Produk</th>
                <th className="px-4 py-3">Sisa Stok</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">HPP Satuan</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Total Valuasi</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((p) => {
                const stock = Number(p.stock) || 0;
                const cost = Number(p.unit_cost) || 0;
                const valuation = stock * cost;
                return (
                  <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{p.name}</td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{stock}</td>
                    <td className="px-4 py-3 text-muted">{p.unit || "kg"}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{formatRupiah(cost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">
                      {formatRupiah(Number(p.default_price) || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                      {formatRupiah(valuation)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          stock <= 0
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : stock <= 5
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {stock <= 0 ? "HABIS" : stock <= 5 ? "MENIPIS" : "AMAN"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Belum ada produk aktif yang terdaftar.
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
