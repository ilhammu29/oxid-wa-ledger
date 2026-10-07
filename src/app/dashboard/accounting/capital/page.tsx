import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getStatementOfChangesInEquity } from "@/modules/accounting/reports";
import { formatRupiah } from "@/modules/transactions/money";
import { Coins, ArrowDownLeft, ArrowUpRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CapitalPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const now = new Date();
  const year = now.getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = now.toISOString().slice(0, 10);

  const equity = await getStatementOfChangesInEquity(supabase, {
    businessId: business.id,
    startDate,
    endDate,
  });

  const { data: movements } = await supabase
    .from("capital_movements")
    .select("id, movement_date, type, amount, description, created_at")
    .eq("business_id", business.id)
    .order("movement_date", { ascending: false });

  const rows = movements || [];

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
            Laporan Perubahan Ekuitas
          </Link>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted">{row.movement_date}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {formatRupiah(Number(row.amount))}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Belum ada data pergerakan modal atau prive.
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
