import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listPlatformUsers, getPlatformAdminUser } from "@/modules/subscriptions";
import { AdminUsersClientView } from "@/components/admin/admin-users-client-view";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const currentAdmin = await getPlatformAdminUser(currentUser, supabase);
  const users = await listPlatformUsers(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Manajemen Pengguna & Platform Admin
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Direktori pengguna sistem: pemisahan hak akses bisnis tenant dengan peran platform administrator internal.
          </p>
        </div>
      </div>

      <AdminUsersClientView
        users={users}
        currentAdminRole={currentAdmin?.role || "viewer"}
        currentUserId={currentUser?.id || ""}
      />
    </div>
  );
}
