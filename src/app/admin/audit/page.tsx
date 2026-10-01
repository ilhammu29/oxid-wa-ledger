import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAdminAuditLogs, listAllBusinessesForAdmin } from "@/modules/subscriptions";
import { AdminAuditClientView } from "@/components/admin/admin-audit-client-view";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const supabase = await createClient();

  const [logs, businesses] = await Promise.all([
    getAdminAuditLogs(supabase, { limit: 100 }),
    listAllBusinessesForAdmin(supabase),
  ]);

  const bizNameMap: Record<string, string> = {};
  for (const b of businesses) {
    bizNameMap[b.id] = b.name;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Log Audit & Jejak Aktivitas Platform
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Rekaman permanen seluruh tindakan administratif: aktivasi, perubahan peran, perpanjangan masa aktif, dan mutasi langganan.
          </p>
        </div>
      </div>

      <AdminAuditClientView logs={logs} businessMap={bizNameMap} />
    </div>
  );
}
