"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { NetProfitTrendPoint } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { formatCompactIDR, formatFullIDR, getChartThemeColors } from "./chart-utils";

interface NetProfitChartProps {
  data: NetProfitTrendPoint[];
}

export function NetProfitChart({ data }: NetProfitChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const hasData = data.some((d) => d.grossProfit !== 0 || d.operatingExpenses !== 0);

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data laba bersih pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Laba bersih dihitung dari Laba Kotor dikurangi seluruh Beban Operasional.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={colors.grid}
          />
          <ReferenceLine y={0} stroke={colors.axisLine} strokeWidth={1.5} />
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
                const item = payload[0].payload as NetProfitTrendPoint;
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground min-w-[180px] space-y-1.5">
                    <p className="font-semibold text-muted font-mono pb-1 border-b border-border/60">
                      {item.displayDate} ({item.date})
                    </p>
                    <div className="flex justify-between items-center text-muted">
                      <span>Laba Kotor:</span>
                      <span className="font-mono font-semibold text-foreground">{formatFullIDR(item.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted">
                      <span>Beban Usaha:</span>
                      <span className="font-mono font-semibold text-rose-500">-{formatFullIDR(item.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/60">
                      <span className="font-medium text-foreground">Laba Bersih:</span>
                      <span className={`font-mono font-bold ${
                        item.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>
                        {formatFullIDR(item.netProfit)}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="netProfit"
            name="Laba Bersih"
            stroke={colors.emerald}
            strokeWidth={2.5}
            dot={{ r: 3, fill: colors.emerald, stroke: colors.dotBg, strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: colors.emerald, stroke: colors.dotBg, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
