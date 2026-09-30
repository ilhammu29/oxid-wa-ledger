import "server-only";

import { getAuthenticatedBusiness } from "@/modules/auth/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { logoutAction } from "./actions";
import { LogOut, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedBusiness();

  // If user has zero active businesses
  if (session.status === "NO_BUSINESS" || !session.business) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 text-center">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Akses Bisnis Belum Tersedia
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Akun Anda ({session.user.email}) belum terdaftar sebagai anggota atau
            pemilik bisnis aktif dalam sistem OXID WA Ledger.
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar dari Akun
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Fetch active products for this business to populate manual sale dialog
  const supabase = await createClient();
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, unit, default_price, is_default, active")
    .eq("business_id", session.business.id)
    .eq("active", true)
    .order("is_default", { ascending: false });

  const products = (productsData || []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    default_price: Number(p.default_price),
    is_default: Boolean(p.is_default),
    active: Boolean(p.active),
  }));

  return (
    <DashboardShell
      business={session.business}
      role={session.role || "member"}
      userEmail={session.user.email || ""}
      products={products}
    >
      {children}
    </DashboardShell>
  );
}
