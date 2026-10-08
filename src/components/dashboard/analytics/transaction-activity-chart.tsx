"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TransactionActivity } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { getChartThemeColors } from "./chart-utils";
import { Bot, Laptop, MessageSquare } from "lucide-react";

interface TransactionActivityChartProps {
  data: TransactionActivity;
}

export function TransactionActivityChart({ data }: TransactionActivityChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const totalTx = data.byHour.reduce((sum, h) => sum + h.count, 0);

  if (totalTx === 0) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada aktivitas transaksi pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Grafik jam operasional dan rasio kanal akan terbentuk saat transaksi dicatat.</p>
      </div>
    );
  }

  // Filter out late-night hours with zero transactions if business is day-only (keep 06:00 to 22:00 or all)
  const displayHours = data.byHour.filter((h) => h.hour >= 5 && h.hour <= 23);

  return (
    <div className="space-y-4 text-xs">
      {/* Channel Breakdown Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {data.bySource.map((s) => {
          const Icon = s.source === "telegram" ? Bot : s.source === "whatsapp" ? MessageSquare : Laptop;
          return (
            <div
              key={s.source}
              className="p-3 rounded-xl border border-border bg-surface space-y-1 shadow-2xs"
            >
              <div className="flex items-center justify-between text-muted text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  <span>{s.label}</span>
                </span>
                <span className="font-mono text-[10px]">{s.percentage}%</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground tabular-nums">
                {s.count} <span className="text-xs font-normal text-muted font-sans">tx</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Hourly Bar Chart */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground text-xs">
            Distribusi Transaksi per Jam Operasional (Waktu Lokal)
          </span>
          <span className="text-[11px] text-muted font-mono">
            {totalTx} Total Transaksi
          </span>
        </div>

        <div className="w-full h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayHours}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={colors.grid}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: colors.axis, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
                axisLine={{ stroke: colors.axisLine }}
                tickLine={false}
              />
              <YAxis
                width={36}
                tick={{ fill: colors.axis, fontSize: 10, fontFamily: "var(--font-mono, monospace)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as { label: string; count: number };
                    return (
                      <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-2.5 shadow-xl text-xs text-foreground min-w-[120px]">
                        <p className="font-semibold text-muted font-mono mb-0.5">
                          Pukul {item.label}
                        </p>
                        <p className="text-primary font-bold text-sm font-mono tabular-nums">
                          {item.count} transaksi
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                name="Transaksi"
                fill={colors.primary}
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
