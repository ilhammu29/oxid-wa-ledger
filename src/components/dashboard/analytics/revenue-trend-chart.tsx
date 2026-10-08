"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { RevenueTrendPoint } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { formatCompactIDR, formatFullIDR, getChartThemeColors } from "./chart-utils";

interface RevenueTrendChartProps {
  data: RevenueTrendPoint[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const hasData = data.some((d) => d.revenue > 0);

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data penjualan tercatat pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Transaksi yang terkonfirmasi via bot atau dashboard akan muncul otomatis di sini.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.primary} stopOpacity={isDark ? 0.25 : 0.12} />
              <stop offset="95%" stopColor={colors.primary} stopOpacity={0.0} />
            </linearGradient>
          </defs>
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
                const item = payload[0].payload as RevenueTrendPoint;
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground min-w-[160px]">
                    <p className="font-semibold text-muted font-mono mb-1">
                      {item.displayDate} ({item.date})
                    </p>
                    <p className="text-primary font-bold text-base font-mono tabular-nums">
                      {formatFullIDR(item.revenue)}
                    </p>
                    <p className="text-muted text-[11px] mt-1 font-mono">
                      {item.transactions} transaksi tercatat
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Omzet"
            stroke={colors.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGlow)"
            activeDot={{ r: 4, fill: colors.primary, stroke: colors.dotBg, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
