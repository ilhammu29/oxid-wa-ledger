import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { formatRupiah } from "@/modules/transactions/money";
import { Users, CheckCircle, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const { data: receivables } = await supabase
    .from("receivables")
    .select("id, customer_name, total_amount, paid_amount, status, due_date, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const rows = receivables || [];
  const totalReceivables = rows.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0);
  const totalPaid = rows.reduce((acc, row) => acc + (Number(row.paid_amount) || 0), 0);
  const totalOutstanding = totalReceivables - totalPaid;

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
          <p className="text-[11px] text-muted mt-1">Akumulasi seluruh transaksi kredit</p>
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
          <p className="text-[11px] text-muted mt-1">Sudah masuk ke saldo kas</p>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {rows.map((row) => {
                const total = Number(row.total_amount) || 0;
                const paid = Number(row.paid_amount) || 0;
                const rem = total - paid;
                return (
                  <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.customer_name}</td>
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
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {row.status === "paid"
                          ? "LUNAS"
                          : row.status === "partially_paid"
                          ? "SEBAGIAN"
                          : "BELUM BAYAR"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Tidak ada piutang outstanding saat ini.
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
