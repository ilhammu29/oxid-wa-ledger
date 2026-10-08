"use client";

import { ReceivablePayableSnapshot } from "@/modules/analytics/types";
import { formatFullIDR } from "./chart-utils";
import { Users, Scale } from "lucide-react";

interface ArApChartProps {
  data: ReceivablePayableSnapshot;
}

export function ArApChart({ data }: ArApChartProps) {
  const { totalReceivables, totalPayables, netPosition, receivablesList, payablesList } = data;

  const hasData = totalReceivables > 0 || totalPayables > 0;

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada piutang atau hutang aktif saat ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Transaksi penjualan tempo (piutang) dan pembelian tempo (hutang) akan terlacak di sini.</p>
      </div>
    );
  }

  const maxTotal = Math.max(totalReceivables, totalPayables, 1);
  const recPercent = Math.min(100, Math.max(10, (totalReceivables / maxTotal) * 100));
  const payPercent = Math.min(100, Math.max(10, (totalPayables / maxTotal) * 100));

  return (
    <div className="space-y-4 text-xs">
      {/* Top 2 Balance Comparisons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Receivables (AR) */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Piutang Usaha (AR)</span>
            </span>
            <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              Uang Masuk
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {formatFullIDR(totalReceivables)}
          </p>
          <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${recPercent}%` }} />
          </div>
          <p className="text-[11px] text-muted font-mono">
            {data.receivablesCount} tagihan belum lunas
          </p>
        </div>

        {/* Payables (AP) */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-muted flex items-center gap-1.5 font-medium">
              <Scale className="w-3.5 h-3.5 text-amber-500" />
              <span>Hutang Usaha (AP)</span>
            </span>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Kewajiban
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-foreground tabular-nums">
            {formatFullIDR(totalPayables)}
          </p>
          <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${payPercent}%` }} />
          </div>
          <p className="text-[11px] text-muted font-mono">
            {data.payablesCount} kewajiban belum lunas
          </p>
        </div>
      </div>

      {/* Net Position Summary Banner */}
      <div className="p-3 rounded-lg border border-border/80 bg-surface-hover/50 flex items-center justify-between">
        <span className="text-muted">Posisi Kredit Bersih (Piutang - Hutang):</span>
        <span className={`font-mono font-bold text-sm ${
          netPosition >= 0 ? "text-emerald-500" : "text-rose-500"
        }`}>
          {formatFullIDR(netPosition)}
        </span>
      </div>

      {/* Outstanding Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Outstanding AR */}
        <div className="border border-border rounded-xl bg-surface p-3 space-y-2 shadow-2xs">
          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider font-mono block pb-1 border-b border-border/60">
            Daftar Piutang Pelanggan Terbesar
          </span>
          <div className="divide-y divide-border/60">
            {receivablesList.slice(0, 4).map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between first:pt-1 last:pb-0">
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-foreground truncate">{r.contactName}</p>
                  <p className="text-[10px] text-muted font-mono">
                    {r.dueDate ? `Jatuh tempo: ${r.dueDate}` : "Tanpa jatuh tempo"}
                  </p>
                </div>
                <span className="font-mono font-semibold text-sky-500 tabular-nums shrink-0">
                  {formatFullIDR(r.remainingAmount)}
                </span>
              </div>
            ))}
            {receivablesList.length === 0 && (
              <div className="py-4 text-center text-muted text-[11px] italic">
                Semua piutang lunas
              </div>
            )}
          </div>
        </div>

        {/* Outstanding AP */}
        <div className="border border-border rounded-xl bg-surface p-3 space-y-2 shadow-2xs">
          <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider font-mono block pb-1 border-b border-border/60">
            Daftar Hutang Pemasok Terbesar
          </span>
          <div className="divide-y divide-border/60">
            {payablesList.slice(0, 4).map((p) => (
              <div key={p.id} className="py-2 flex items-center justify-between first:pt-1 last:pb-0">
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-foreground truncate">{p.contactName}</p>
                  <p className="text-[10px] text-muted font-mono">
                    {p.dueDate ? `Jatuh tempo: ${p.dueDate}` : "Tanpa jatuh tempo"}
                  </p>
                </div>
                <span className="font-mono font-semibold text-amber-500 tabular-nums shrink-0">
                  {formatFullIDR(p.remainingAmount)}
                </span>
              </div>
            ))}
            {payablesList.length === 0 && (
              <div className="py-4 text-center text-muted text-[11px] italic">
                Semua hutang lunas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
