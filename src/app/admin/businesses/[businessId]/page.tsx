import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOxidSuperAdmin, getBusinessDetailForAdmin, getAllPlans } from "@/modules/subscriptions";
import { AdminBusinessDetailView } from "@/components/admin/admin-business-detail-view";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-zinc-100 mb-1">Akses Ditolak</h1>
          <p className="text-xs text-zinc-400 mb-4">Silakan login sebagai admin platform.</p>
          <Link
            href="/login"
            className="inline-flex px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700"
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-zinc-100 mb-1">403 Terlarang</h1>
          <p className="text-xs text-zinc-400 mb-4">Akun Anda tidak memiliki hak akses admin platform.</p>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700"
          >
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const detail = await getBusinessDetailForAdmin(supabase, businessId);
  if (!detail) {
    notFound();
  }

  const plans = getAllPlans();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin/businesses"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Bisnis
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                ADMIN KLIEN
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mt-1.5">
                {detail.business.name}
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">{detail.business.id}</p>
            </div>
          </div>
        </div>

        <AdminBusinessDetailView detail={detail} plans={plans} />
      </div>
    </div>
  );
}
