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
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e4e4e7"
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatIDR}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 shadow-xl text-xs text-zinc-100">
                    <p className="font-semibold text-zinc-300 font-mono mb-1">
                      {item.displayDate} ({item.date})
                    </p>
                    <p className="text-emerald-400 font-bold text-sm">
                      Rp{new Intl.NumberFormat("id-ID").format(item.revenue)}
                    </p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      {item.quantity} kg • {item.transactionCount} transaksi
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="revenue"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
