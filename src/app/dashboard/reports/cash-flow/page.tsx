import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getCashFlowStatement } from "@/modules/accounting/reports";
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

export default async function CashFlowPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  if (!hasPlanFeature(subState.plan.code, "cash_flow")) {
    return (
      <UpgradeGateCard
        featureName="Laporan Arus Kas (Cash Flow)"
        description="Laporan Arus Kas terperinci yang mengelompokkan aktivitas operasional, investasi, dan pendanaan hanya tersedia pada Paket Pro."
      />
    );
  }

  const sp = await searchParams;
  let startDate = sp.startDate;
  let endDate = sp.endDate;

  if (!startDate || !endDate) {
    const timezone = await getBusinessTimezone(supabase, business.id);
    const range = getMonthUtcRange(new Date(), timezone);
    startDate = range.startAt.toISOString().slice(0, 10);
    endDate = range.endAt.toISOString().slice(0, 10);
  }

  const cf = await getCashFlowStatement(supabase, {
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
            Laporan Arus Kas (Cash Flow)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Periode: <span className="font-mono font-medium text-foreground">{startDate} s.d. {endDate}</span> (Metode Langsung)
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
          <span className="text-xs text-muted">Kas Awal Periode</span>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(cf.beginningCashAndBank)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Arus Kas Operasi</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">
            {formatRupiah(cf.netOperatingCashFlow)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Kenaikan / (Penurunan) Kas</span>
          <p className={`text-2xl font-bold mt-2 tabular-nums ${
            cf.netCashChange >= 0 ? "text-primary" : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatRupiah(cf.netCashChange)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border shadow-xs">
          <span className="text-xs text-muted">Kas Akhir Periode</span>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {formatRupiah(cf.endingCashAndBank)}
          </p>
        </div>
      </div>

      {/* Structured Cash Flow Statement Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs max-w-3xl">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted font-mono mb-4 pb-2 border-b border-border">
          Rincian Arus Kas Metode Langsung
        </h2>

        <div className="space-y-5 text-xs">
          {/* Operating Section */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>ARUS KAS AKTIVITAS OPERASI</span>
              <span className="font-mono">{formatRupiah(cf.netOperatingCashFlow)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Penerimaan Kas dari Penjualan Tunai</span>
              <span className="font-mono">{formatRupiah(cf.cashFromSales)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Penerimaan Pelunasan Piutang Pelanggan</span>
              <span className="font-mono">{formatRupiah(cf.customerCollections)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Pembayaran Kas untuk Beban Operasional</span>
              <span className="font-mono text-rose-500">-{formatRupiah(cf.cashPaidForExpenses)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Pembayaran Kas ke Pemasok / Pembelian</span>
              <span className="font-mono text-rose-500">-{formatRupiah(cf.cashPaidToSuppliers)}</span>
            </div>
          </div>

          {/* Investing Section */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>ARUS KAS AKTIVITAS INVESTASI</span>
              <span className="font-mono">{formatRupiah(cf.netInvestingCashFlow)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Pengeluaran Pembelian Aset Tetap</span>
              <span className="font-mono text-rose-500">
                {cf.fixedAssetPurchases > 0 ? `-${formatRupiah(cf.fixedAssetPurchases)}` : formatRupiah(0)}
              </span>
            </div>
          </div>

          {/* Financing Section */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>ARUS KAS AKTIVITAS PENDANAAN</span>
              <span className="font-mono">{formatRupiah(cf.netFinancingCashFlow)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Setoran Modal Pemilik</span>
              <span className="font-mono">{formatRupiah(cf.capitalContributions)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Penarikan Prive Pemilik</span>
              <span className="font-mono text-rose-500">
                {cf.ownerWithdrawals > 0 ? `-${formatRupiah(cf.ownerWithdrawals)}` : formatRupiah(0)}
              </span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Penerimaan Pencairan Pinjaman</span>
              <span className="font-mono">{formatRupiah(cf.loanProceeds)}</span>
            </div>
            <div className="flex justify-between text-muted pl-4">
              <span>Pembayaran Pokok Pinjaman</span>
              <span className="font-mono text-rose-500">
                {cf.loanPrincipalRepayments > 0 ? `-${formatRupiah(cf.loanPrincipalRepayments)}` : formatRupiah(0)}
              </span>
            </div>
          </div>

          {/* Net Change and Reconciliation */}
          <div className="pt-4 border-t-2 border-border space-y-1.5">
            <div className="flex justify-between font-bold text-sm text-foreground">
              <span>KENAIKAN / (PENURUNAN) KAS BERSIH</span>
              <span className="font-mono">{formatRupiah(cf.netCashChange)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Saldo Kas Awal Periode</span>
              <span className="font-mono">{formatRupiah(cf.beginningCashAndBank)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border text-foreground">
              <span>SALDO KAS AKHIR PERIODE</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(cf.endingCashAndBank)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
