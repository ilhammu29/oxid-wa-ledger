"use client";

import { ExpenseBreakdownItem } from "@/modules/analytics/types";
import { formatFullIDR } from "./chart-utils";

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownItem[];
  totalExpenses: number;
}

export function ExpenseBreakdownChart({ data, totalExpenses }: ExpenseBreakdownChartProps) {
  if (data.length === 0 || totalExpenses === 0) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada pengeluaran operasional pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Catat pengeluaran melalui bot (contoh: &ldquo;listrik 150 ribu&rdquo;) atau menu Pengeluaran.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Visual Proportion Bar */}
      <div className="h-3 w-full bg-surface-hover rounded-full overflow-hidden flex border border-border/80">
        {data.map((item, idx) => {
          const colors = [
            "bg-primary",
            "bg-sky-500",
            "bg-amber-500",
            "bg-rose-500",
            "bg-indigo-500",
            "bg-emerald-500",
            "bg-zinc-500",
          ];
          const colorClass = colors[idx % colors.length];
          return (
            <div
              key={item.accountCode}
              className={`${colorClass} h-full transition-all duration-300`}
              style={{ width: `${Math.max(2, item.percentage)}%` }}
              title={`${item.accountName}: ${item.percentage}% (${formatFullIDR(item.amount)})`}
            />
          );
        })}
      </div>

      {/* Ruled Accounts Table */}
      <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-surface text-xs">
        {data.map((item, idx) => {
          const dotColors = [
            "bg-primary",
            "bg-sky-500",
            "bg-amber-500",
            "bg-rose-500",
            "bg-indigo-500",
            "bg-emerald-500",
            "bg-zinc-500",
          ];
          const dotColor = dotColors[idx % dotColors.length];
          return (
            <div
              key={item.accountCode}
              className="p-3 flex items-center justify-between hover:bg-surface-hover/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.accountName}</p>
                  <p className="text-[10px] text-muted font-mono">Kode {item.accountCode}</p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <p className="font-mono font-semibold text-foreground tabular-nums">
                  {formatFullIDR(item.amount)}
                </p>
                <p className="text-[10px] text-muted font-mono tabular-nums">
                  {item.percentage}% dari total
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
