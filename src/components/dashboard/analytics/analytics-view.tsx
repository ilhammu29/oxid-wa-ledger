"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FullAnalyticsData, AnalyticsPeriod } from "@/modules/analytics/types";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { ProfitComparisonChart } from "./profit-comparison-chart";
import { NetProfitChart } from "./net-profit-chart";
import { ExpenseBreakdownChart } from "./expense-breakdown-chart";
import { TopProductsChart } from "./top-products-chart";
import { SalesVolumeChart } from "./sales-volume-chart";
import { CashBankChart } from "./cash-bank-chart";
import { ArApChart } from "./ar-ap-chart";
import { InventoryChart } from "./inventory-chart";
import { TransactionActivityChart } from "./transaction-activity-chart";
import { formatFullIDR } from "./chart-utils";
import {
  TrendingUp,
  FileDown,
  Scale,
  CreditCard,
  Wallet,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface AnalyticsViewProps {
  data: FullAnalyticsData;
  currentPeriod: AnalyticsPeriod;
  businessName: string;
}

export function AnalyticsView({
  data,
  currentPeriod,
  businessName,
}: AnalyticsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { kpis } = data;

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      router.push(`/dashboard/analytics?${params.toString()}`);
    });
  };

  const periodOptions: Array<{ label: string; value: AnalyticsPeriod }> = [
    { label: "7 Hari", value: "7d" },
    { label: "30 Hari", value: "30d" },
    { label: "Bulan Ini", value: "this_month" },
    { label: "Bulan Lalu", value: "last_month" },
    { label: "12 Bulan", value: "12m" },
  ];

  return (
    <div className={`space-y-6 transition-opacity duration-150 ${isPending ? "opacity-60" : "opacity-100"}`}>
      {/* Header & Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Analitik & Performa Usaha
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Data pembukuan terverifikasi untuk <span className="font-semibold text-foreground">{businessName}</span> · {kpis.periodLabel}
          </p>
        </div>

        {/* Right Actions: Period Filter & Export */}
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <div className="flex items-center p-1 bg-surface-hover/80 border border-border rounded-xl gap-0.5">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePeriodChange(opt.value)}
                disabled={isPending}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  currentPeriod === opt.value
                    ? "bg-surface text-foreground shadow-2xs font-semibold border border-border/60"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/reports/export"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-surface border border-border hover:bg-surface-hover text-foreground transition-colors shadow-2xs"
            title="Ekspor Laporan Excel"
          >
            <FileDown className="w-3.5 h-3.5 text-muted" />
            <span className="hidden sm:inline">Excel</span>
          </Link>
        </div>
      </div>

      {/* Top 4 Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Omzet / Revenue */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Omzet Penjualan</span>
            <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              Total
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatFullIDR(kpis.totalRevenue)}
            </p>
            <p className="text-[11px] text-muted mt-1 font-mono">
              {kpis.totalTransactions} transaksi ({kpis.totalQuantity} kg/unit)
            </p>
          </div>
        </div>

        {/* Laba Kotor & Margin */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Laba Kotor (Gross)</span>
            <span className="text-[10px] font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              Margin {kpis.grossMarginPercent}%
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400 tabular-nums">
              {formatFullIDR(kpis.grossProfit)}
            </p>
            <p className="text-[11px] text-muted mt-1 font-mono">
              HPP Modal: {formatFullIDR(kpis.totalCogs)}
            </p>
          </div>
        </div>

        {/* Laba Bersih & Margin */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Laba Bersih (Net)</span>
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              kpis.netProfit >= 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20"
            }`}>
              {kpis.netProfit >= 0 ? `Margin ${kpis.netMarginPercent}%` : "Defisit"}
            </span>
          </div>
          <div className="mt-2.5">
            <p className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums ${
              kpis.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {formatFullIDR(kpis.netProfit)}
            </p>
            <p className="text-[11px] text-muted mt-1 font-mono">
              Beban Usaha: {formatFullIDR(kpis.totalExpenses)}
            </p>
          </div>
        </div>

        {/* Likuiditas Kas & Bank */}
        <div className="p-4 sm:p-5 rounded-xl bg-surface border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Kas & Bank Tersedia</span>
            <span className="text-[10px] font-mono font-medium text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              Likuiditas
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {formatFullIDR(kpis.totalCashBank)}
            </p>
            <p className="text-[11px] text-muted mt-1 font-mono">
              Aset Stok: {formatFullIDR(kpis.totalInventoryValue)}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: Tren Penjualan & Volume (Charts 1 & 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span>1. Grafik Perkembangan Omzet</span>
              </h3>
              <p className="text-xs text-muted">Tren omzet transaksi per hari ({kpis.periodLabel})</p>
            </div>
            <span className="text-xs font-mono font-semibold text-primary">
              Rata-rata: {formatFullIDR(kpis.averageOrderValue)} / order
            </span>
          </div>
          <RevenueTrendChart data={data.revenueTrend} />
        </div>

        <div className="lg:col-span-4 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              6. Tren Volume Penjualan
            </h3>
            <p className="text-xs text-muted">Kuantitas fisik komoditas per hari</p>
          </div>
          <SalesVolumeChart data={data.salesVolume} />
        </div>
      </div>

      {/* SECTION 2: Profitabilitas & Margin (Charts 2 & 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                <span>2. Perbandingan Omzet vs HPP vs Laba Kotor</span>
              </h3>
              <p className="text-xs text-muted">Melihat kontribusi margin kotor harian setelah harga modal</p>
            </div>
          </div>
          <ProfitComparisonChart data={data.profitTrend} />
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>3. Tren Laba Bersih (Net Profit)</span>
              </h3>
              <p className="text-xs text-muted">Hasil akhir setelah dikurangi seluruh beban operasional</p>
            </div>
          </div>
          <NetProfitChart data={data.netProfitTrend} />
        </div>
      </div>

      {/* SECTION 3: Struktur Beban & Produk Unggulan (Charts 4 & 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>4. Struktur Beban Operasional</span>
              </h3>
              <p className="text-xs text-muted">Distribusi biaya usaha per akun Buku Besar ({kpis.periodLabel})</p>
            </div>
            <span className="text-xs font-mono font-semibold text-rose-500">
              Total: {formatFullIDR(kpis.totalExpenses)}
            </span>
          </div>
          <ExpenseBreakdownChart
            data={data.expenseBreakdown}
            totalExpenses={kpis.totalExpenses}
          />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                5. Peringkat Produk Terlaris
              </h3>
              <p className="text-xs text-muted">Diurutkan berdasarkan kontribusi omzet & volume</p>
            </div>
            <Link
              href="/dashboard/products"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Semua Produk</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <TopProductsChart data={data.topProducts} />
        </div>
      </div>

      {/* SECTION 4: Likuiditas & Neraca Finansial (Charts 7 & 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Wallet className="w-4 h-4 text-sky-500" />
                <span>7. Saldo Likuiditas Kas & Bank</span>
              </h3>
              <p className="text-xs text-muted">Akumulasi saldo tunai kas (1100) dan rekening bank (1200)</p>
            </div>
            <Link
              href="/dashboard/accounting/cash-bank"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Buku Kas</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <CashBankChart data={data.cashBankTrend} />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-500" />
                <span>8. Piutang (AR) vs Hutang (AP)</span>
              </h3>
              <p className="text-xs text-muted">Posisi tagihan belum lunas dan kewajiban jatuh tempo</p>
            </div>
            <Link
              href="/dashboard/accounting/receivables"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Kelola Piutang</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <ArApChart data={data.receivablesPayables} />
        </div>
      </div>

      {/* SECTION 5: Persediaan & Efisiensi Jam Operasional (Charts 9 & 10) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                9. Posisi Persediaan & Mutasi Stok
              </h3>
              <p className="text-xs text-muted">Nilai aset barang dagang dan peringatan stok menipis</p>
            </div>
            <Link
              href="/dashboard/accounting/inventory"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Kartu Stok</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <InventoryChart data={data.inventory} />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>10. Aktivitas Jam Transaksi & Kanal</span>
              </h3>
              <p className="text-xs text-muted">Jam sibuk operasional kasir dan rasio pesanan per kanal</p>
            </div>
          </div>
          <TransactionActivityChart data={data.transactionActivity} />
        </div>
      </div>
    </div>
  );
}
