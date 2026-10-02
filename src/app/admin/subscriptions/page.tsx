import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listAllSubscriptionsForAdmin, getPlatformAdminUser } from "@/modules/subscriptions";
import { AdminSubscriptionsClientView } from "@/components/admin/admin-subscriptions-client-view";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  const subscriptions = await listAllSubscriptionsForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Langganan SaaS
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoring siklus hidup langganan tenant: aktivasi manual, perpanjangan masa aktif, penangguhan, dan reaktivasi.
          </p>
        </div>
      </div>

      <AdminSubscriptionsClientView
        subscriptions={subscriptions}
        adminRole={currentAdmin?.role || "viewer"}
      />
    </div>
  );
}
