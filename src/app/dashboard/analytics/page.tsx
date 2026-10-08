import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getFullAnalyticsData } from "@/modules/analytics/service";
import { AnalyticsPeriod } from "@/modules/analytics/types";
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
