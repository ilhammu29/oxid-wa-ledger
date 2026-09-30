import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { getBusinessLocalDate, getTodayUtcRange } from "@/modules/transactions";
import { DailyStatusView, DailyStatusRecord } from "@/components/dashboard/daily-status-view";

export const dynamic = "force-dynamic";

export default async function DailyStatusPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  const timezone = business.timezone || "Asia/Jakarta";
  const now = new Date();
  const todayDate = getBusinessLocalDate(now, timezone);
  const todayUtcRange = getTodayUtcRange(now, timezone);

  // 1. Check if confirmed sales exist today
  const { count: salesCount } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id)
    .eq("status", "confirmed")
    .gte("transaction_at", todayUtcRange.startAt.toISOString())
    .lte("transaction_at", todayUtcRange.endAt.toISOString());

  const hasSalesToday = (salesCount || 0) > 0;

  // 2. Fetch today's status if explicitly set
  const { data: todayStatusData } = await supabase
    .from("business_daily_status")
    .select("local_date, status, source, note, created_at")
    .eq("business_id", business.id)
    .eq("local_date", todayDate)
    .maybeSingle();

  // 3. Fetch recent monthly status history
  const { data: historyData } = await supabase
    .from("business_daily_status")
    .select("local_date, status, source, note, created_at")
    .eq("business_id", business.id)
    .order("local_date", { ascending: false })
    .limit(31);

  const canManage = session.role === "owner" || session.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Status Operasional Harian
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Tandai hari tanpa penjualan atau hari libur untuk menjaga integritas ledger.
        </p>
      </div>

      <DailyStatusView
        todayDate={todayDate}
        todayStatus={todayStatusData as DailyStatusRecord | null}
        history={(historyData || []) as DailyStatusRecord[]}
        canManage={canManage}
        hasSalesToday={hasSalesToday}
      />
    </div>
  );
}
