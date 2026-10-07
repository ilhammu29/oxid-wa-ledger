import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getBalanceSheet } from "@/modules/accounting/reports";
import { formatRupiah } from "@/modules/transactions/money";
import { CheckCircle2, AlertTriangle, FileDown } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    asOfDate?: string;
  }>;
}

export default async function BalanceSheetPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const sp = await searchParams;
  const asOfDate = sp.asOfDate || new Date().toISOString().slice(0, 10);

  const bs = await getBalanceSheet(supabase, {
    businessId: business.id,
    asOfDate,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Neraca Keuangan (Balance Sheet)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Posisi per <span className="font-mono font-medium text-foreground">{asOfDate}</span> (Berdasarkan Double-Entry Engine)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/export/accounting-excel?endDate=${asOfDate}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors shadow-xs"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </a>
        </div>
      </div>

      {/* Balance Equation Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between shadow-xs ${
          bs.isBalanced
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {bs.isBalanced ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <div>
            <h4 className="font-semibold text-xs sm:text-sm">
              {bs.isBalanced ? "Persamaan Akuntansi Seimbang" : "Peringatan: Neraca Tidak Seimbang"}
            </h4>
            <p className="text-xs opacity-90 font-mono">
              Total Aset ({formatRupiah(bs.totalAssets)}) {bs.isBalanced ? "=" : "≠"} Kewajiban ({formatRupiah(bs.totalLiabilities)}) + Ekuitas ({formatRupiah(bs.equity.totalEquity)})
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Assets vs Liabilities & Equity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Left Column: Assets */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">ASET</h3>
            <span className="font-mono font-bold text-sm text-foreground">{formatRupiah(bs.totalAssets)}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-muted text-[11px] uppercase tracking-wider">Aset Lancar</div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1100</span>Kas</span>
              <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentAssets.cash)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1200</span>Bank</span>
              <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentAssets.bank)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1300</span>Piutang Usaha</span>
              <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentAssets.accountsReceivable)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1400</span>Persediaan Barang</span>
              <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentAssets.inventory)}</span>
            </div>
            <div className="flex justify-between py-1 font-semibold text-foreground">
              <span>Total Aset Lancar</span>
              <span className="font-mono">{formatRupiah(bs.currentAssets.totalCurrentAssets)}</span>
            </div>

            <div className="font-semibold text-muted text-[11px] uppercase tracking-wider pt-2">Aset Tidak Lancar</div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1500</span>Aset Tetap</span>
              <span className="font-mono font-medium text-foreground">{formatRupiah(bs.nonCurrentAssets.fixedAssetsCost)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-foreground"><span className="font-mono text-muted mr-1.5">1590</span>Akumulasi Penyusutan</span>
              <span className="font-mono font-medium text-rose-600 dark:text-rose-400">-{formatRupiah(bs.nonCurrentAssets.accumulatedDepreciation)}</span>
            </div>
            <div className="flex justify-between py-1 font-semibold text-foreground">
              <span>Total Aset Tetap Bersih</span>
              <span className="font-mono">{formatRupiah(bs.nonCurrentAssets.netFixedAssets)}</span>
            </div>
          </div>

          <div className="pt-3 border-t-2 border-border flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL ASET</span>
            <span className="font-mono">{formatRupiah(bs.totalAssets)}</span>
          </div>
        </div>

        {/* Right Column: Liabilities & Equity */}
        <div className="space-y-6">
          {/* Liabilities */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">KEWAJIBAN (HUTANG)</h3>
              <span className="font-mono font-bold text-sm text-foreground">{formatRupiah(bs.totalLiabilities)}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">2100</span>Hutang Usaha</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentLiabilities.accountsPayable)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">2300</span>Kewajiban Lancar Lain</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(bs.currentLiabilities.otherCurrentLiabilities)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">2200</span>Hutang Bank / Jangka Panjang</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(bs.nonCurrentLiabilities.loansPayable)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-between font-bold text-xs text-foreground">
              <span>TOTAL KEWAJIBAN</span>
              <span className="font-mono">{formatRupiah(bs.totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">EKUITAS (MODAL)</h3>
              <span className="font-mono font-bold text-sm text-foreground">{formatRupiah(bs.equity.totalEquity)}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">3100</span>Modal Pemilik</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(bs.equity.ownerCapital)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">3200</span>Prive Pemilik</span>
                <span className="font-mono font-medium text-rose-600 dark:text-rose-400">-{formatRupiah(bs.equity.ownerDraw)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground"><span className="font-mono text-muted mr-1.5">3300</span>Laba Ditahan</span>
                <span className="font-mono font-medium text-foreground">{formatRupiah(bs.equity.retainedEarnings)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-foreground">Laba Bersih Tahun Berjalan</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">{formatRupiah(bs.equity.currentPeriodProfit)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-between font-bold text-xs text-foreground">
              <span>TOTAL EKUITAS</span>
              <span className="font-mono">{formatRupiah(bs.equity.totalEquity)}</span>
            </div>
          </div>

          {/* Sum of Liabilities + Equity */}
          <div className="p-4 rounded-xl border border-border bg-surface-hover flex justify-between font-bold text-sm text-foreground">
            <span>TOTAL KEWAJIBAN + EKUITAS</span>
            <span className="font-mono">{formatRupiah(bs.totalLiabilitiesAndEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
