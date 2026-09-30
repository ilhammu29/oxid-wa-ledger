import { redirect } from "next/navigation";
import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { createClient } from "@/lib/supabase/server";
import { getMonitoringData } from "@/modules/monitoring";
import { MonitoringView } from "@/components/dashboard/monitoring-view";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const session = await getAuthenticatedBusiness();
  if (session.status !== "OK" || !session.business) {
    redirect("/login");
  }

  const supabase = await createClient();
  const monitoringData = await getMonitoringData(supabase, session.business.id);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <MonitoringView
        data={monitoringData}
        role={session.role || "member"}
        timezone={session.business.timezone || "Asia/Jakarta"}
      />
    </div>
  );
}
