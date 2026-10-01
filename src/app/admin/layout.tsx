import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getPlatformAdminUser } from "@/modules/subscriptions";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { ShieldCheck, ArrowLeft, ShieldAlert, UserCheck } from "lucide-react";

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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-zinc-100 mb-1">Akses Ditolak</h1>
          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Sesi autentikasi belum ditemukan. Silakan masuk terlebih dahulu untuk mengakses Platform Admin OXID.
          </p>
          <Link
            href="/login"
            className="inline-flex px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700 transition-colors"
          >
            Menuju Halaman Login
          </Link>
        </div>
      </div>
    );
  }

  const adminRecord = await getPlatformAdminUser(user, supabase);
  if (!adminRecord || !adminRecord.active) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-zinc-100 mb-1">403 Akses Terlarang</h1>
          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Akun Anda ({user.email}) tidak terdaftar atau tidak memiliki status aktif sebagai administrator platform OXID Ledger.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard Usaha
          </Link>
        </div>
      </div>
    );
  }

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin",
    support_admin: "Support Admin",
    billing_admin: "Billing Admin",
    viewer: "Platform Viewer",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-zinc-900/90 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-zinc-100">OXID</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">ADMIN</span>
              </div>
              <p className="text-[10px] text-zinc-400">Control Center</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <AdminNav />

        {/* User Profile & Return Link */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <div className="px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[130px]" title={user.email}>
                {user.email}
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">
                {roleLabelMap[adminRecord.role] || adminRecord.role}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <UserCheck className="w-3 h-3 text-emerald-400" />
              <span>Platform Operator</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ke Dashboard Merchant</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-zinc-950 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
