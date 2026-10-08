import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getProfitAndLoss } from "@/modules/accounting/reports";
import { formatRupiah } from "@/modules/transactions/money";
import { getBusinessTimezone } from "@/modules/transactions/service";
import { getMonthUtcRange } from "@/modules/transactions/timezone";
import { getBusinessSubscriptionState, hasPlanFeature } from "@/modules/subscriptions";
import { UpgradeGateCard } from "@/components/dashboard/upgrade-gate-card";
import { FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ProfitLossPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  if (!hasPlanFeature(subState.plan.code, "profit_loss")) {
    return (
      <UpgradeGateCard
        featureName="Laporan Laba Rugi (P&L)"
        description="Laporan Laba Rugi terperinci dengan perhitungan HPP otomatis, laba kotor, dan laba bersih hanya tersedia pada Paket Pro."
      />
    );
  }

  const sp = await searchParams;
  let startDate: string = sp.startDate || "";
  let endDate: string = sp.endDate || "";

  if (!startDate || !endDate) {
    const timezone = await getBusinessTimezone(supabase, business.id);
    const range = getMonthUtcRange(new Date(), timezone);
    startDate = range.startAt.toISOString().slice(0, 10);
    endDate = range.endAt.toISOString().slice(0, 10);
  }

  const pnl = await getProfitAndLoss(supabase, {
    businessId: business.id,
    startDate,
    endDate,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Laporan Laba Rugi (P&L)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Periode: <span className="font-mono font-medium text-foreground">{startDate} s.d. {endDate}</span> (Berdasarkan Buku Besar)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/accounting-excel?startDate=${startDate}&endDate=${endDate}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Omzet / Pendapatan</span>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(pnl.netRevenue)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Harga Pokok (HPP)</span>
          <p className="text-2xl font-bold text-muted mt-2 tabular-nums">
            {formatRupiah(pnl.cogs)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Laba Kotor</span>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2 tabular-nums">
            {formatRupiah(pnl.grossProfit)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Laba Bersih</span>
          <p className={`text-2xl font-bold mt-2 tabular-nums ${
            pnl.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatRupiah(pnl.netProfit)}
          </p>
        </div>
      </div>

      {/* Structured PnL Statement Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted font-mono mb-4 pb-2 border-b border-border">
          Rincian Laporan Keuangan
        </h2>

        <div className="space-y-4 text-xs">
          {/* Revenue Section */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>PENDAPATAN USAHA</span>
              <span>{formatRupiah(pnl.netRevenue)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Penjualan Barang Dagang</span>
              <span>{formatRupiah(pnl.grossSales)}</span>
            </div>
            {pnl.salesReturns > 0 && (
              <div className="flex justify-between text-muted pl-4">
                <span>Retur Penjualan</span>
                <span>-{formatRupiah(pnl.salesReturns)}</span>
              </div>
            )}
          </div>

          {/* COGS Section */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>HARGA POKOK PENJUALAN (HPP)</span>
              <span>{formatRupiah(pnl.cogs)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>HPP Barang Terjual</span>
              <span>{formatRupiah(pnl.cogs)}</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="flex justify-between font-bold text-sm text-blue-600 dark:text-blue-400 py-2 border-y border-border">
            <span>LABA KOTOR</span>
            <span>{formatRupiah(pnl.grossProfit)}</span>
          </div>

          {/* Operating Expenses Section */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>BEBAN OPERASIONAL</span>
              <span>{formatRupiah(pnl.totalOperatingExpenses)}</span>
            </div>
            {pnl.operatingExpenses.map((exp) => (
              <div key={exp.accountCode} className="flex justify-between text-muted pl-4">
                <span>{exp.accountName} ({exp.accountCode})</span>
                <span>{formatRupiah(exp.amount)}</span>
              </div>
            ))}
            {pnl.operatingExpenses.length === 0 && (
              <div className="text-muted pl-4 italic">Belum ada beban operasional tercatat.</div>
            )}
          </div>

          {/* Net Profit Final */}
          <div className="flex justify-between font-bold text-base pt-4 border-t-2 border-border text-foreground">
            <span>LABA BERSIH TAHUN BERJALAN</span>
            <span className={pnl.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
              {formatRupiah(pnl.netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
