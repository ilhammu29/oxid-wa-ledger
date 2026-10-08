import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getFullAnalyticsData } from "@/modules/analytics/service";
import { AnalyticsPeriod } from "@/modules/analytics/types";
import { getBusinessSubscriptionState, hasPlanFeature } from "@/modules/subscriptions";
import { UpgradeGateCard } from "@/components/dashboard/upgrade-gate-card";
import { AnalyticsView } from "@/components/dashboard/analytics/analytics-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    period?: string;
  }>;
}

export default async function AnalyticsDashboardPage({ searchParams }: PageProps) {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // Authoritative Feature Entitlement Check
  const subState = await getBusinessSubscriptionState(supabase, business.id);
  if (!hasPlanFeature(subState.plan.code, "accounting_analytics")) {
    return (
      <UpgradeGateCard
        featureName="Analitik & Grafik Finansial"
        description="Dashboard analitik 10 grafik (omzet, laba kotor vs bersih, rasio AR/AP, aktivitas transaksi, tren mingguan & bulanan) hanya tersedia pada Paket Pro."
      />
    );
  }

  const sp = await searchParams;
  const rawPeriod = sp.period || "30d";
  const validPeriods: AnalyticsPeriod[] = ["7d", "30d", "this_month", "last_month", "12m"];
  const period: AnalyticsPeriod = validPeriods.includes(rawPeriod as AnalyticsPeriod)
    ? (rawPeriod as AnalyticsPeriod)
    : "30d";

  const data = await getFullAnalyticsData(supabase, business.id, period);

  return (
    <AnalyticsView
      data={data}
      currentPeriod={period}
      businessName={business.name}
    />
  );
}
