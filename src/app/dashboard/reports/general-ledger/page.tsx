import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getGeneralLedger } from "@/modules/accounting/reports";
import { ensureBusinessChartOfAccounts } from "@/modules/accounting/coa";
import { getBusinessTimezone } from "@/modules/transactions/service";
import { getMonthUtcRange } from "@/modules/transactions/timezone";
import { getBusinessSubscriptionState, hasPlanFeature } from "@/modules/subscriptions";
import { GeneralLedgerClientView } from "@/components/dashboard/general-ledger-client-view";
import { UpgradeGateCard } from "@/components/dashboard/upgrade-gate-card";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    accountCode?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function GeneralLedgerPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  const isEntitled = hasPlanFeature(subState.plan.code, "general_ledger");

  if (!isEntitled) {
    return (
      <UpgradeGateCard
        featureName="Buku Besar (General Ledger)"
        description="Buku Besar terperinci untuk melacak mutasi debit, kredit, dan saldo berjalan setiap akun keuangan hanya tersedia pada Paket Pro."
      />
    );
  }

  const sp = await searchParams;
  const selectedCode = sp.accountCode || "1100"; // default: Kas
  let startDate = sp.startDate;
  let endDate = sp.endDate;

  if (!startDate || !endDate) {
    const timezone = await getBusinessTimezone(supabase, business.id);
    const range = getMonthUtcRange(new Date(), timezone);
    startDate = range.startAt.toISOString().slice(0, 10);
    endDate = range.endAt.toISOString().slice(0, 10);
  }

  const allAccounts = await ensureBusinessChartOfAccounts(supabase, business.id);

  let ledgerData = null;
  try {
    ledgerData = await getGeneralLedger(supabase, {
      businessId: business.id,
      accountCode: selectedCode,
      startDate,
      endDate,
    });
  } catch (err) {
    console.warn(`[GeneralLedgerPage] Could not load ledger for ${selectedCode}:`, err);
  }

  return (
    <GeneralLedgerClientView
      allAccounts={allAccounts}
      ledgerData={ledgerData}
      selectedCode={selectedCode}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
