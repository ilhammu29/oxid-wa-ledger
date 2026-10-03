import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAdminAuditLogs, listAllBusinessesForAdmin, getPlatformAdminUser, hasPlatformPermission } from "@/modules/subscriptions";
import { AdminAuditClientView } from "@/components/admin/admin-audit-client-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  if (!currentAdmin || !currentAdmin.active || !hasPlatformPermission(currentAdmin.role, "audit:read")) {
    redirect("/admin");
  }

  const [logs, businesses] = await Promise.all([
    getAdminAuditLogs(supabase, { limit: 100 }),
    listAllBusinessesForAdmin(supabase),
  ]);

  const bizNameMap: Record<string, string> = {};
  for (const b of businesses) {
    bizNameMap[b.id] = b.name;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Audit Trail Platform
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Rekaman permanen seluruh tindakan administratif: aktivasi, perubahan peran, perpanjangan masa aktif, dan mutasi langganan.
          </p>
        </div>
      </div>

      <AdminAuditClientView logs={logs} businessMap={bizNameMap} />
    </div>
  );
}
