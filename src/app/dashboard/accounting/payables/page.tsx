import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import { Scale, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: payables } = await supabase
    .from("payables")
    .select("id, supplier_name, total_amount, paid_amount, status, due_date, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const rows = payables || [];
  const totalPayables = rows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const totalPaid = rows.reduce((acc, row) => acc + (Number(row.paid_amount) || 0), 0);
  const totalOutstanding = totalPayables - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Hutang Usaha (Kewajiban Supplier)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Daftar kewajiban pembayaran tempo ke supplier barang dagangan atau pihak ketiga.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Total Hutang Timbul</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(totalPayables)}
          </p>
          <p className="text-[11px] text-muted mt-1">Kewajiban pembelian tempo</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Sisa Hutang (Outstanding)</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2 tabular-nums">
            {formatRupiah(totalOutstanding)}
          </p>
          <p className="text-[11px] text-muted mt-1">Harus dilunasi ke supplier</p>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Sudah Dilunasi</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {formatRupiah(totalPaid)}
          </p>
          <p className="text-[11px] text-muted mt-1">Telah dibayarkan via kas/bank</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Daftar Hutang Supplier</h3>
          <span className="text-xs text-muted font-mono">{rows.length} supplier</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface-hover text-muted uppercase font-mono text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">Supplier / Pihak</th>
                <th className="px-4 py-3">Total Hutang</th>
                <th className="px-4 py-3">Sudah Dibayar</th>
                <th className="px-4 py-3">Sisa Hutang</th>
                <th className="px-4 py-3">Jatuh Tempo</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => {
                const total = Number(row.total_amount) || 0;
                const paid = Number(row.paid_amount) || 0;
                const rem = total - paid;
                return (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.supplier_name}</td>
                    <td className="px-4 py-3 font-mono text-muted">{formatRupiah(total)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(paid)}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {formatRupiah(rem)}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{row.due_date || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          row.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : row.status === "partially_paid"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {row.status === "paid"
                          ? "LUNAS"
                          : row.status === "partially_paid"
                          ? "SEBAGIAN"
                          : "BELUM LUNAS"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Tidak ada hutang usaha yang tercatat saat ini.
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
