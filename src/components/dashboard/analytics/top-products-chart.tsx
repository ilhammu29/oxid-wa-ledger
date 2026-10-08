"use client";

import { TopProductItem } from "@/modules/analytics/types";
import { formatFullIDR } from "./chart-utils";

interface TopProductsChartProps {
  data: TopProductItem[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data penjualan produk pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Produk terlaris akan diurutkan otomatis berdasarkan omzet dan volume penjualan.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.totalRevenue), 1);

  return (
    <div className="w-full space-y-3">
      {data.map((item, idx) => {
        const barWidth = Math.min(100, Math.max(8, (item.totalRevenue / maxRevenue) * 100));

        return (
          <div
            key={item.productId}
            className="p-3 rounded-xl border border-border bg-surface hover:border-border transition-colors space-y-2 shadow-2xs"
          >
            <div className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 h-5 rounded-md bg-surface-hover border border-border text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-semibold text-foreground truncate max-w-[160px] sm:max-w-[240px]">
                  {item.productName}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {formatFullIDR(item.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Proportion Bar */}
            <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted font-mono pt-0.5">
              <span>
                {item.totalQuantity} {item.unit} terjual
              </span>
              <span>
                {item.transactionCount} transaksi ({item.percentage}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
