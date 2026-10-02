import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listAllPaymentsForAdmin, getPlatformAdminUser } from "@/modules/subscriptions";
import { AdminPaymentsClientView } from "@/components/admin/admin-payments-client-view";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  const payments = await listAllPaymentsForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
