import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import Link from "next/link";
import { ArrowDownRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, expense_date, category, description, amount, payment_account, status, created_at")
    .eq("business_id", business.id)
    .order("expense_date", { ascending: false });

  const rows = expenses || [];
  const totalExpense = rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  // Group by category
  const categoryMap = new Map<string, number>();
  rows.forEach((r) => {
    const cat = r.category || "operasional";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (Number(r.amount) || 0));
  });

  const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pengeluaran & Beban Usaha
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Catatan beban operasional bisnis yang terhubung ke buku besar dan arus kas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports/profit-loss"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
          >
            Lihat Laba Rugi
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Pengeluaran Tercatat</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalExpense)}
          </p>
          <p className="text-[11px] text-muted mt-1">{rows.length} transaksi beban</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs sm:col-span-2">
          <div className="text-xs text-muted mb-2 font-medium">Beban per Kategori Terbesar</div>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 5).map(([cat, amt]) => (
              <div
                key={cat}
                className="px-2.5 py-1 rounded-md bg-surface-hover border border-border text-xs flex items-center gap-2"
              >
                <span className="font-medium capitalize text-foreground">{cat}:</span>
                <span className="font-mono text-muted">{formatRupiah(amt)}</span>
              </div>
            ))}
            {categories.length === 0 && (
              <span className="text-xs text-muted">Belum ada kategori pengeluaran.</span>
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
                <th className="px-4 py-3">Metode Bayar</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-muted">{row.expense_date}</td>
                  <td className="px-4 py-3 font-medium capitalize text-foreground">
                    <span className="px-2 py-0.5 rounded bg-surface-hover border border-border text-[11px]">
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground/90 max-w-[250px] truncate">
                    {row.description || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.payment_account || "KAS"}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    {formatRupiah(Number(row.amount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Tercatat
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Belum ada data pengeluaran. Anda dapat mencatat lewat Telegram (contoh: &ldquo;Listrik 150 ribu&rdquo;) atau dashboard.
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
