import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isOxidSuperAdmin, listAllBusinessesForAdmin } from "@/modules/subscriptions";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage() {
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
          <p className="text-xs text-zinc-400 mb-4">Silakan masuk dengan akun admin OXID terlebih dahulu.</p>
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
          <p className="text-xs text-zinc-400 mb-4">
            Akun Anda ({user.email}) tidak memiliki hak akses sebagai admin internal platform OXID.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:bg-zinc-700"
          >
            Kembali ke Dashboard Usaha
          </Link>
        </div>
      </div>
    );
  }

  const businesses = await listAllBusinessesForAdmin(supabase);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Daftar Bisnis Klien
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola seluruh tenant bisnis: status langganan, masa aktif, kanal terhubung, dan detail operasional.
          </p>
        </div>
      </div>

        {/* Business List Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Daftar Bisnis Terdaftar ({businesses.length})</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Seluruh tenant dalam database OXID Ledger.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Nama Bisnis</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Onboarding</th>
                  <th className="py-3 px-4">Kanal Utama</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Sisa Hari</th>
                  <th className="py-3 px-4">Aktivitas Terakhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {businesses.map((b) => {
                  let statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (b.subscriptionStatus === "trialing") statusColor = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  if (b.subscriptionStatus === "grace_period") statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (b.subscriptionStatus === "suspended") statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  if (b.subscriptionStatus === "cancelled") statusColor = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

                  const pct = b.onboardingPercentage ?? 0;
                  const isComplete = pct === 100;

                  return (
                    <tr key={b.id} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-zinc-100">{b.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {b.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium capitalize">
                              {b.category}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 font-mono">{b.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium capitalize text-zinc-200">{b.planName}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${statusColor}`}>
                          {b.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isComplete
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}>
                            {pct}% {isComplete ? "Selesai" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                          <span title="Telegram">{b.telegramConnected ? "🤖 TG ✓" : "🤖 TG -"}</span>
                          <span>·</span>
                          <span title="Transaksi Pertama">{b.firstTransactionRecorded ? "💵 Tx ✓" : "💵 Tx -"}</span>
                          <span>·</span>
                          <span title="Google Sheets">{b.googleSheetsConnected ? "📊 Sheets ✓" : "📊 Sheets -"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize font-mono text-[11px] text-zinc-400">{b.primaryChannel}</td>
                      <td className="py-3.5 px-4 text-zinc-300">{formatDate(b.currentPeriodEnd)}</td>
                      <td className="py-3.5 px-4 font-bold text-zinc-100">{b.remainingDays} hari</td>
                      <td className="py-3.5 px-4 text-zinc-400">{formatDate(b.lastActivityAt)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                        >
                          Kelola
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
