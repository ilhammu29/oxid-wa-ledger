"use client";

import { InventoryAnalytics } from "@/modules/analytics/types";
import { formatFullIDR } from "./chart-utils";
import { Boxes, AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface InventoryChartProps {
  data: InventoryAnalytics;
}

export function InventoryChart({ data }: InventoryChartProps) {
  const { totalInventoryValue, totalItemsCount, items, movementsSummary } = data;

  if (items.length === 0) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data produk atau persediaan</p>
        <p className="text-[11px] text-muted/70 mt-1">Tambahkan produk dan harga modal (HPP) untuk melacak nilai aset persediaan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Top Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1.5 shadow-2xs">
          <span className="text-muted text-[11px] flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-primary" />
            <span>Total Nilai Persediaan</span>
          </span>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {formatFullIDR(totalInventoryValue)}
          </p>
          <p className="text-[10px] text-muted">Akun 1400 (Persediaan)</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1.5 shadow-2xs">
          <span className="text-muted text-[11px] flex items-center gap-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Barang Masuk (Periode Ini)</span>
          </span>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{movementsSummary.totalInQty} unit
          </p>
          <p className="text-[10px] text-muted font-mono">Nilai: {formatFullIDR(movementsSummary.totalInCost)}</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1.5 shadow-2xs">
          <span className="text-muted text-[11px] flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
            <span>Barang Keluar (Terjual)</span>
          </span>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            -{movementsSummary.totalOutQty} unit
          </p>
          <p className="text-[10px] text-muted font-mono">HPP: {formatFullIDR(movementsSummary.totalOutCost)}</p>
        </div>
      </div>

      {/* Product Stock Table */}
      <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-foreground text-xs">
            Status Stok & Nilai per Komoditas ({totalItemsCount} Produk)
          </span>
        </div>
        <div className="divide-y divide-border/60">
          {items.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="p-3 flex items-center justify-between hover:bg-surface-hover/50 transition-colors"
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{item.name}</span>
                  {item.isLowStock && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Menipis</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted font-mono mt-0.5">
                  Modal: {formatFullIDR(item.unitCost)} / {item.unit}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="font-mono font-semibold text-foreground tabular-nums">
                  {item.stock} {item.unit}
                </p>
                <p className="text-[10px] text-muted font-mono tabular-nums">
                  Aset: {formatFullIDR(item.totalValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
