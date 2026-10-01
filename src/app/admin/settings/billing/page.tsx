import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getBillingPaymentSettingsForAdmin, getPlatformAdminUser } from "@/modules/subscriptions";
import { AdminBillingSettingsClientView } from "@/components/admin/admin-billing-settings-client-view";

export const dynamic = "force-dynamic";

export default async function AdminBillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentAdmin = await getPlatformAdminUser(user, supabase);
  const settings = await getBillingPaymentSettingsForAdmin(supabase);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Pengaturan Rekening Tagihan Manual
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Konfigurasi informasi rekening bank resmi yang ditampilkan kepada pelanggan di halaman langganan mereka.
          </p>
        </div>
      </div>

      <AdminBillingSettingsClientView
        settings={settings}
        adminRole={currentAdmin?.role || "viewer"}
      />
    </div>
  );
}
