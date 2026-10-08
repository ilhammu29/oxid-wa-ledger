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
import { SalesVolumePoint } from "@/modules/analytics/types";
import { useTheme } from "@/components/theme/theme-provider";
import { getChartThemeColors } from "./chart-utils";

interface SalesVolumeChartProps {
  data: SalesVolumePoint[];
}

export function SalesVolumeChart({ data }: SalesVolumeChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = getChartThemeColors(isDark);

  const hasData = data.some((d) => d.quantity > 0);

  if (!hasData) {
    return (
      <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
        <p className="text-xs text-muted font-medium">Belum ada data volume unit/kg pada periode ini</p>
        <p className="text-[11px] text-muted/70 mt-1">Volume dihitung dari kuantitas penjualan yang tercatat dalam satuan kg atau pcs.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
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
            width={48}
            tickFormatter={(val) => `${val}kg`}
            tick={{ fill: colors.axis, fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as SalesVolumePoint;
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground min-w-[150px]">
                    <p className="font-semibold text-muted font-mono mb-1">
                      {item.displayDate} ({item.date})
                    </p>
                    <p className="text-sky-500 font-bold text-base font-mono tabular-nums">
                      {item.quantity} {item.unit}
                    </p>
                    <p className="text-muted text-[11px] mt-0.5">
                      Total kuantitas barang terkirim
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="quantity"
            name="Volume Terjual"
            fill={colors.sky}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
