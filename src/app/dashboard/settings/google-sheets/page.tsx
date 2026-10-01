import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { GoogleSheetsView } from "@/components/dashboard/google-sheets-view";
import { isGoogleSheetsConfigured } from "@/modules/google-sheets";

export const dynamic = "force-dynamic";

export default async function GoogleSheetsSettingsPage() {
  const session = await getAuthenticatedBusiness();
  const business = session.business!;
  const supabase = await createClient();

  // 1. Fetch connection
  const { data: connection } = await supabase
    .from("google_sheets_connections")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  // 2. Fetch pending queue job if any
  const { data: pendingJobs } = await supabase
    .from("google_sheets_sync_queue")
    .select("id, status, reason, attempt_count, created_at, available_at")
    .eq("business_id", business.id)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(1);

  // 3. Fetch recent sync runs
  const { data: recentRuns } = await supabase
    .from("google_sheets_sync_runs")
    .select(
      "id, started_at, finished_at, status, rows_transactions, rows_products, rows_daily_status, error_code, error_message"
    )
    .eq("business_id", business.id)
    .order("started_at", { ascending: false })
    .limit(5);

  const isServerConfigured = isGoogleSheetsConfigured();
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Integrasi Google Sheets
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Sinkronisasi satu arah (one-way mirror) dari buku kas Supabase ke Google Spreadsheet Anda.
        </p>
      </div>

      <GoogleSheetsView
        connection={connection || null}
        pendingJob={pendingJobs && pendingJobs.length > 0 ? pendingJobs[0] : null}
        recentRuns={recentRuns || []}
        isServerConfigured={isServerConfigured}
        serviceAccountEmail={serviceAccountEmail}
        role={session.role || "member"}
      />
    </div>
  );
}
