import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listPlatformUsers, getPlatformAdminUser, hasPlatformPermission } from "@/modules/subscriptions";
import { AdminUsersClientView } from "@/components/admin/admin-users-client-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/login");
  }

  const currentAdmin = await getPlatformAdminUser(currentUser, supabase);
  if (!currentAdmin || !currentAdmin.active || !hasPlatformPermission(currentAdmin.role, "users:read")) {
    redirect("/admin");
  }

  const users = await listPlatformUsers(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pengguna & Admin Platform
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
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
