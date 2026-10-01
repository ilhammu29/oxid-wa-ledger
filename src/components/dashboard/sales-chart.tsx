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

interface SalesChartProps {
  data: {
    date: string;
    revenue: number;
    quantity: number;
    transactionCount: number;
  }[];
}

export function SalesChart({ data }: SalesChartProps) {
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

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255, 255, 255, 0.05)"
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatIDR}
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl bg-[#111726] border border-violet-500/30 p-3 shadow-2xl text-xs text-slate-100 glow-purple-sm">
                    <p className="font-semibold text-slate-400 font-mono mb-1">
                      {item.displayDate} ({item.date})
                    </p>
                    <p className="text-violet-400 font-bold text-base">
                      Rp{new Intl.NumberFormat("id-ID").format(item.revenue)}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
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
            stroke="#8B5CF6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#purpleGlow)"
            activeDot={{ r: 6, fill: "#A78BFA", stroke: "#111726", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
