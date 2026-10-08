/**
 * Shared Utilities & Design Tokens for Recharts in OXID Ledger.
 * Strictly adheres to Swiss Precision & Ruled Financial Ledger design rules.
 */

export const formatCompactIDR = (val: number): string => {
  if (val === 0) return "Rp0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${(abs / 1_000).toFixed(0)}rb`;
  }
  return `${sign}Rp${abs}`;
};

export const formatFullIDR = (val: number): string => {
  return `Rp${new Intl.NumberFormat("id-ID").format(val)}`;
};

export interface ChartThemeColors {
  primary: string;
  primaryHover: string;
  emerald: string;
  rose: string;
  amber: string;
  sky: string;
  indigo: string;
  slate: string;
  grid: string;
  axis: string;
  axisLine: string;
  dotBg: string;
}

export function getChartThemeColors(isDark: boolean): ChartThemeColors {
  return {
    primary: isDark ? "#8B5CF6" : "#7C3AED",
    primaryHover: isDark ? "#A78BFA" : "#6D28D9",
    emerald: "#10B981",
    rose: isDark ? "#F87171" : "#EF4444",
    amber: isDark ? "#FBBF24" : "#F59E0B",
    sky: isDark ? "#38BDF8" : "#0284C7",
    indigo: isDark ? "#818CF8" : "#4F46E5",
    slate: isDark ? "#64748B" : "#94A3B8",
    grid: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)",
    axis: isDark ? "#94A3B8" : "#64748B",
    axisLine: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    dotBg: isDark ? "#121215" : "#FFFFFF",
  };
}
