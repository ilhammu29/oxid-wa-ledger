import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getPlatformAdminUser,
  getPlatformSystemStatus,
  listAllPaymentsForAdmin,
} from "@/modules/subscriptions";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminRecord = await getPlatformAdminUser(user, supabase);
  if (!adminRecord || !adminRecord.active) {
    redirect("/dashboard");
  }

  // Pre-fetch operational indicators for topbar & sidebar badges
  const [systemStatus, pendingPayments] = await Promise.all([
    getPlatformSystemStatus(supabase).catch(() => []),
    listAllPaymentsForAdmin(supabase, { status: "pending" }).catch(() => []),
  ]);

  const healthyServicesCount = systemStatus.filter((s) => s.status === "healthy").length;
  const totalServicesCount = systemStatus.length || 6;

  return (
    <AdminShell
      userEmail={user.email || ""}
      adminRole={adminRecord.role}
      healthyServicesCount={healthyServicesCount}
      totalServicesCount={totalServicesCount}
      pendingPaymentsCount={pendingPayments.length}
    >
      {children}
    </AdminShell>
  );
}
