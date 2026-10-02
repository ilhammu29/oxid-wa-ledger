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
import { useTheme } from "@/components/theme/theme-provider";

interface SalesChartProps {
  data: {
    date: string;
    revenue: number;
    quantity: number;
    transactionCount: number;
  }[];
}

export function SalesChart({ data }: SalesChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const chartData = data.map((d) => {
    // Format "YYYY-MM-DD" into short label like "28 Sep"
    const parts = d.date.split("-");
    const day = parts[2] || "";
    const month = parts[1] || "";
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const monthName = months[parseInt(month, 10) - 1] || month;

    return {
      date: d.date,
      displayDate: `${day} ${monthName}`,
      revenue: d.revenue,
      quantity: d.quantity,
      transactionCount: d.transactionCount,
    };
  });

  const formatIDR = (val: number) => {
    if (val >= 1000000) {
      return `Rp${(val / 1000000).toFixed(1)}jt`;
    }
    if (val >= 1000) {
      return `Rp${(val / 1000).toFixed(0)}rb`;
    }
    return `Rp${val}`;
  };

  const strokeColor = isDark ? "#8B5CF6" : "#7C3AED";
  const gridStroke = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)";
  const axisColor = isDark ? "#94A3B8" : "#64748B";
  const axisLine = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const dotStroke = isDark ? "#111726" : "#FFFFFF";

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
        >
          <defs>
            <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.18 : 0.08} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={gridStroke}
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: axisColor, fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
            axisLine={{ stroke: axisLine }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatIDR}
            tick={{ fill: axisColor, fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl bg-surface/95 backdrop-blur-xs border border-border p-3 shadow-xl text-xs text-foreground">
                    <p className="font-semibold text-muted font-mono mb-1">
                      {item.displayDate} ({item.date})
                    </p>
                    <p className="text-primary font-bold text-base font-mono tabular-nums">
                      Rp{new Intl.NumberFormat("id-ID").format(item.revenue)}
                    </p>
                    <p className="text-muted text-[11px] mt-1 font-mono">
                      {item.quantity} kg • {item.transactionCount} transaksi
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
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#purpleGlow)"
            activeDot={{ r: 4.5, fill: strokeColor, stroke: dotStroke, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
