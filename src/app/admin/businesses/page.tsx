import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminUser, hasPlatformPermission, listAllBusinessesForAdmin } from "@/modules/subscriptions";
import { redirect } from "next/navigation";
import { AdminBusinessesClientView } from "@/components/admin/admin-businesses-client-view";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminRecord = await getPlatformAdminUser(user, supabase);
  if (!adminRecord || !adminRecord.active || !hasPlatformPermission(adminRecord.role, "businesses:read")) {
    redirect("/dashboard");
  }

  const businesses = await listAllBusinessesForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Bisnis Klien
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola seluruh tenant bisnis: status langganan, masa aktif, kanal terhubung, dan detail operasional.
          </p>
        </div>
      </div>

      {/* Main Content View */}
      <AdminBusinessesClientView businesses={businesses} />
    </div>
  );
}
