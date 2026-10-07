import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from("fixed_assets")
    .select("id, name, asset_code, acquisition_date, acquisition_cost, accumulated_depreciation, book_value, useful_life_months, status, created_at")
    .eq("business_id", business.id)
    .order("acquisition_date", { ascending: false });

  const rows = assets || [];
  const totalCost = rows.reduce((acc, a) => acc + (Number(a.acquisition_cost) || 0), 0);
  const totalDepr = rows.reduce((acc, a) => acc + (Number(a.accumulated_depreciation) || 0), 0);
  const totalBookValue = totalCost - totalDepr;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Aset Tetap & Peralatan
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Daftar inventaris aset jangka panjang, penyusutan akumulasi, dan nilai buku (book value).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Harga Perolehan Aset</span>
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalCost)}
          </p>
          <p className="text-[11px] text-muted mt-1">Nilai beli awal seluruh aset</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="text-xs text-muted">Akumulasi Penyusutan</div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2 tabular-nums">
            {formatRupiah(totalDepr)}
          </p>
          <p className="text-[11px] text-muted mt-1">Pengurangan nilai ekonomis</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="text-xs text-muted">Nilai Buku Bersih (Net Book Value)</div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {formatRupiah(totalBookValue)}
          </p>
          <p className="text-[11px] text-muted mt-1">Tercatat di neraca per hari ini</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Aset Tetap</h3>
          <span className="text-xs text-muted font-mono">{rows.length} aset</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Nama Aset</th>
                <th className="px-4 py-3">Tanggal Perolehan</th>
                <th className="px-4 py-3 text-right">Harga Perolehan</th>
                <th className="px-4 py-3 text-right">Akum. Penyusutan</th>
                <th className="px-4 py-3 text-right">Nilai Buku</th>
                <th className="px-4 py-3 text-center">Masa Manfaat</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => {
                const cost = Number(row.acquisition_cost) || 0;
                const depr = Number(row.accumulated_depreciation) || 0;
                const bookVal = cost - depr;
                return (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <div>{row.name}</div>
                      {row.asset_code && (
                        <div className="text-[10px] font-mono text-muted">{row.asset_code}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{row.acquisition_date}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{formatRupiah(cost)}</td>
                    <td className="px-4 py-3 text-right font-mono text-rose-500">{formatRupiah(depr)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                      {formatRupiah(bookVal)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-muted">
                      {row.useful_life_months ? `${Math.round(row.useful_life_months / 12)} tahun` : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                        {row.status || "Aktif"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Belum ada data aset tetap yang terdaftar.
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
