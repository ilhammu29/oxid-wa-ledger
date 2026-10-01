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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Verifikasi Pembayaran Manual
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Konfirmasi bukti transfer langganan tenant: penambahan masa aktif otomatis dan pencatatan audit log perpanjangan.
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
