import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listAllPaymentsForAdmin, getPlatformAdminUser, hasPlatformPermission } from "@/modules/subscriptions";
import { AdminPaymentsClientView } from "@/components/admin/admin-payments-client-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  if (!currentAdmin || !currentAdmin.active || !hasPlatformPermission(currentAdmin.role, "payments:read")) {
    redirect("/admin");
  }

  const payments = await listAllPaymentsForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Konfirmasi Pembayaran
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Verifikasi transfer manual langganan tenant: penambahan masa aktif otomatis dan pencatatan audit log perpanjangan.
          </p>
        </div>
      </div>

      <AdminPaymentsClientView
        payments={payments}
        adminRole={currentAdmin?.role || "viewer"}
      />
    </div>
  );
}
