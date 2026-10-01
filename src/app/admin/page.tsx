import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getPlatformOverviewKPIs,
  listAllBusinessesForAdmin,
  listAllPaymentsForAdmin,
  getPlatformSystemStatus,
  getAdminAuditLogs,
} from "@/modules/subscriptions";
import { formatIDR } from "@/modules/subscriptions/plans";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [kpis, businesses, payments, systemStatus, auditLogs] = await Promise.all([
    getPlatformOverviewKPIs(supabase),
    listAllBusinessesForAdmin(supabase),
    listAllPaymentsForAdmin(supabase, { status: "pending" }),
    getPlatformSystemStatus(supabase),
    getAdminAuditLogs(supabase, { limit: 6 }),
  ]);

  const recentBusinesses = businesses.slice(0, 5);
  const pendingPayments = payments.slice(0, 5);

  const healthyServices = systemStatus.filter((s) => s.status === "healthy").length;
  const totalServices = systemStatus.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">Platform Control Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              LIVE
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Monitoring multi-tenant, siklus langganan SaaS, dan verifikasi operasional platform OXID Ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/system"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistem: {healthyServices}/{totalServices} Siap</span>
          </Link>

          <Link
            href="/admin/payments"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors shadow-sm"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{kpis.pendingPaymentsCount} Bayar Menunggu</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Businesses */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Total Bisnis Klien</span>
            <Building2 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{kpis.totalBusinesses}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Tenant terdaftar di database</p>
        </div>

        {/* Active Subscriptions & Trials */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Status Langganan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{kpis.activeSubscriptions}</span>
            <span className="text-xs text-zinc-400">Aktif</span>
            <span className="text-zinc-600">/</span>
            <span className="text-lg font-bold font-mono text-blue-400">{kpis.activeTrials}</span>
            <span className="text-xs text-zinc-400">Trial</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.gracePeriodSubscriptions} tenggang · {kpis.suspendedSubscriptions} ditangguhkan
          </p>
        </div>

        {/* Pending Payments */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Pembayaran Menunggu</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {kpis.pendingPaymentsCount > 0 ? formatIDR(kpis.pendingPaymentsTotalIdr) : "Rp 0"}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.pendingPaymentsCount} bukti transfer perlu verifikasi
          </p>
        </div>

        {/* Ledger Transaction Volume */}
        <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Volume Ledger Omset</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">
            {formatIDR(kpis.totalRevenueVolumeIdr)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.totalTransactionsCount} total transaksi terverifikasi
          </p>
        </div>
      </div>

      {/* Secondary Integrations Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Kanal Telegram Pilot</p>
              <p className="text-[11px] text-zinc-500">Primary Channel & Notifikasi Expiry</p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-zinc-300">
            {kpis.connectedChannels.telegramCount} Bisnis
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Google Sheets Sync</p>
              <p className="text-[11px] text-zinc-500">One-way mirror spreadsheet aktif</p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono text-zinc-300">
            {kpis.googleSheetsConnectedCount} Terhubung
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">WhatsApp Cloud API</p>
              <p className="text-[11px] text-zinc-500">Status Implementasi Step 8</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            Ditunda (Deferred)
          </span>
        </div>
      </div>

      {/* Main Grid: Recent Businesses & Pending Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Businesses */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-zinc-100">Bisnis Klien Terbaru</h2>
            </div>
            <Link
              href="/admin/businesses"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Semua Bisnis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {recentBusinesses.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Belum ada bisnis terdaftar.</p>
            ) : (
              recentBusinesses.map((biz) => (
                <div key={biz.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/admin/businesses/${biz.id}`}
                      className="text-xs font-bold text-zinc-200 hover:text-emerald-400 transition-colors"
                    >
                      {biz.name}
                    </Link>
                    <p className="text-[11px] text-zinc-500">
                      Paket: <span className="text-zinc-400">{biz.planName}</span> · Sisa:{" "}
                      <span className="font-mono text-zinc-300">{biz.remainingDays} hari</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        biz.subscriptionStatus === "active"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : biz.subscriptionStatus === "trialing"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {biz.subscriptionStatus}
                    </span>
                    <Link
                      href={`/admin/businesses/${biz.id}`}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title="Lihat Detail"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Payments to Confirm */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-zinc-100">Pembayaran Perlu Konfirmasi</h2>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Semua Pembayaran</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-zinc-800/80">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-6 text-zinc-500">
                <CheckCircle2 className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs">Tidak ada pembayaran yang menunggu verifikasi.</p>
              </div>
            ) : (
              pendingPayments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{p.businessName}</p>
                    <p className="text-[11px] text-zinc-400">
                      Ref: <span className="font-mono text-zinc-300">{p.reference || "-"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold font-mono text-emerald-400">
                      {formatIDR(p.amountIdr)}
                    </span>
                    <Link
                      href="/admin/payments"
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      Proses
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-100">Aktivitas Platform & Audit Trail</h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>Log Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="pb-2 font-medium">Waktu</th>
                <th className="pb-2 font-medium">Aksi</th>
                <th className="pb-2 font-medium">Operator</th>
                <th className="pb-2 font-medium">Status Baru</th>
                <th className="pb-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-zinc-500">
                    Belum ada log audit tercatat.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/20">
                    <td className="py-2.5 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2.5 font-bold font-mono text-zinc-200">{log.action}</td>
                    <td className="py-2.5 text-zinc-400">{log.actor_email || log.actor_user_id || "System"}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
                        {log.new_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-400 truncate max-w-xs">{log.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
