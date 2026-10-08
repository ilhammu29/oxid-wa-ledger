"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ProfitTrendPoint } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { formatCompactIDR, formatFullIDR, getChartThemeColors } from "./chart-utils";

interface ProfitComparisonChartProps {
  data: ProfitTrendPoint[];
}

export function ProfitComparisonChart({ data }: ProfitComparisonChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const hasData = data.some((d) => d.revenue > 0 || d.cogs > 0);

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data laba kotor & HPP pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Data HPP dihitung otomatis dari unit cost produk atau pembelian persediaan.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={colors.grid}
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            axisLine={{ stroke: colors.axisLine }}
            tickLine={false}
          />
          <YAxis
            width={58}
            tickFormatter={formatCompactIDR}
            tick={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as ProfitTrendPoint;
                const marginPct = item.revenue > 0 ? ((item.grossProfit / item.revenue) * 100).toFixed(1) : "0";
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground min-w-[180px] space-y-1.5">
                    <p className="font-semibold text-muted font-mono pb-1 border-b border-border/60">
                      {item.displayDate} ({item.date})
                    </p>
                    <div className="flex justify-between items-center text-muted">
                      <span>Omzet:</span>
                      <span className="font-mono font-semibold text-foreground">{formatFullIDR(item.revenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted">
                      <span>HPP (Modal):</span>
                      <span className="font-mono font-semibold text-rose-500">{formatFullIDR(item.cogs)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/60">
                      <span className="font-medium text-foreground">Laba Kotor:</span>
                      <span className="font-mono font-bold text-emerald-500">{formatFullIDR(item.grossProfit)}</span>
                    </div>
                    <p className="text-[10px] text-muted font-mono text-right">
                      Margin Kotor: {marginPct}%
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
          />
          <Bar dataKey="revenue" name="Omzet" fill={colors.primary} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="cogs" name="HPP" fill={colors.rose} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="grossProfit" name="Laba Kotor" fill={colors.emerald} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
