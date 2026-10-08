"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { CashBankTrendPoint } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { formatCompactIDR, formatFullIDR, getChartThemeColors } from "./chart-utils";

interface CashBankChartProps {
  data: CashBankTrendPoint[];
}

export function CashBankChart({ data }: CashBankChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const hasData = data.some((d) => d.cash !== 0 || d.bank !== 0);

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada mutasi Kas & Bank tercatat pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Saldo kas & bank dihitung dari posting jurnal double-entry akun 1100 dan 1200.</p>
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
            <linearGradient id="cashGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.emerald} stopOpacity={isDark ? 0.25 : 0.12} />
              <stop offset="95%" stopColor={colors.emerald} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="bankGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.sky} stopOpacity={isDark ? 0.25 : 0.12} />
              <stop offset="95%" stopColor={colors.sky} stopOpacity={0.0} />
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
                const item = payload[0].payload as CashBankTrendPoint;
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground min-w-[180px] space-y-1.5">
                    <p className="font-semibold text-muted font-mono pb-1 border-b border-border/60">
                      {item.displayDate} ({item.date})
                    </p>
                    <div className="flex justify-between items-center text-muted">
                      <span>Kas (1100):</span>
                      <span className="font-mono font-semibold text-emerald-500">{formatFullIDR(item.cash)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted">
                      <span>Bank (1200):</span>
                      <span className="font-mono font-semibold text-sky-500">{formatFullIDR(item.bank)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border/60">
                      <span className="font-medium text-foreground">Total Likuiditas:</span>
                      <span className="font-mono font-bold text-foreground">{formatFullIDR(item.totalLiquidity)}</span>
                    </div>
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
          <Area
            type="monotone"
            dataKey="cash"
            name="Kas Tunai"
            stroke={colors.emerald}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cashGlow)"
          />
          <Area
            type="monotone"
            dataKey="bank"
            name="Rekening Bank"
            stroke={colors.sky}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#bankGlow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
