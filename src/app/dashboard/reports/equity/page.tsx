import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getStatementOfChangesInEquity } from "@/modules/accounting/reports";
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

export default async function EquityPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  if (!hasPlanFeature(subState.plan.code, "accounting")) {
    return (
      <UpgradeGateCard
        featureName="Laporan Perubahan Ekuitas"
        description="Laporan Perubahan Ekuitas terperinci yang melacak modal awal, laba ditahan, dan prive pemilik hanya tersedia pada Paket Pro."
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

  const eq = await getStatementOfChangesInEquity(supabase, {
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
            Laporan Perubahan Ekuitas (Modal)
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Periode: <span className="font-mono font-medium text-foreground">{startDate} s.d. {endDate}</span>
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

      {/* Equity Statement Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs max-w-2xl space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted font-mono pb-2 border-b border-border">
          Pergerakan Modal Usaha
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between py-1 border-b border-border/40 font-medium">
            <span className="text-foreground">Saldo Modal Awal</span>
            <span className="font-mono text-foreground">{formatRupiah(eq.beginningEquity)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40 text-emerald-600 dark:text-emerald-400">
            <span>(+) Setoran Modal Pemilik</span>
            <span className="font-mono">+{formatRupiah(eq.capitalAdditions)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40 text-rose-600 dark:text-rose-400">
            <span>(-) Penarikan Prive Pribadi</span>
            <span className="font-mono">-{formatRupiah(eq.ownerDraws)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-border/40 text-blue-600 dark:text-blue-400">
            <span>(+/-) Laba Bersih Periode Ini</span>
            <span className="font-mono">
              {eq.netProfit >= 0 ? `+${formatRupiah(eq.netProfit)}` : formatRupiah(eq.netProfit)}
            </span>
          </div>

          <div className="flex justify-between py-2 border-y border-border font-semibold text-sm text-foreground">
            <span>Kenaikan / (Penurunan) Ekuitas Bersih</span>
            <span className="font-mono">{formatRupiah(eq.endingEquity - eq.beginningEquity)}</span>
          </div>

          <div className="flex justify-between pt-3 font-bold text-base text-foreground">
            <span>SALDO MODAL AKHIR</span>
            <span className="font-mono text-primary">{formatRupiah(eq.endingEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
