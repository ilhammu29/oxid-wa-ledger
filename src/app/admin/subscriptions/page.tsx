import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listAllSubscriptionsForAdmin, getPlatformAdminUser, hasPlatformPermission } from "@/modules/subscriptions";
import { AdminSubscriptionsClientView } from "@/components/admin/admin-subscriptions-client-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  if (!currentAdmin || !currentAdmin.active || !hasPlatformPermission(currentAdmin.role, "subscriptions:read")) {
    redirect("/admin");
  }

  const subscriptions = await listAllSubscriptionsForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
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
