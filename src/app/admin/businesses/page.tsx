import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOxidSuperAdmin, listAllBusinessesForAdmin } from "@/modules/subscriptions";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminBusinessesClientView } from "@/components/admin/admin-businesses-client-view";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground mb-1">Akses Ditolak</h1>
          <p className="text-xs text-muted-foreground mb-4">
            Silakan masuk dengan akun admin OXID terlebih dahulu.
          </p>
          <Link
            href="/login"
            className="inline-flex px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80"
          >
            Menuju Login
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = await isOxidSuperAdmin(user, supabase);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground mb-1">403 Terlarang</h1>
          <p className="text-xs text-muted-foreground mb-4">
            Akun Anda ({user.email}) tidak memiliki hak akses sebagai admin internal platform OXID.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80"
          >
            Kembali ke Dashboard Usaha
          </Link>
        </div>
      </div>
    );
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
