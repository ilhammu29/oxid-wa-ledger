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
import { formatShortId } from "@/lib/admin-utils";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  ArrowRight,
  Activity,
  Bot,
  ShieldCheck,
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
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & OPERATIONAL SUMMARY
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
              Platform Overview
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OPERASIONAL
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Ringkasan tenant, langganan, pembayaran, dan kesehatan layanan OXID Ledger.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/admin/system"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-border/80 text-xs font-medium text-foreground transition-colors shadow-2xs"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Sistem: {healthyServices}/{totalServices} Siap</span>
          </Link>

          <Link
            href="/admin/payments"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shadow-2xs ${
              kpis.pendingPaymentsCount > 0
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 shrink-0" />
            <span>{kpis.pendingPaymentsCount} Bayar Menunggu</span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI HIERARCHY: RESPONSIVE METRIC CARDS
          - 1 column on mobile (<640px) or 2 cols on tablet, 4 on desktop
          - Values responsive: text-xl sm:text-2xl lg:text-3xl
          - min-w-0 prevents number overflow
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Primary Stat 1: Total Businesses */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-2 sm:mb-3">
              <span className="text-xs font-semibold text-foreground/80 truncate">Total Bisnis Klien</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight tabular-nums text-foreground truncate">
              {kpis.totalBusinesses}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50 truncate">
            Tenant terdaftar di database platform
          </p>
        </div>

        {/* Primary Stat 2: Active Subscriptions & Trials */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-2 sm:mb-3">
              <span className="text-xs font-semibold text-foreground/80 truncate">Status Langganan</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight tabular-nums text-emerald-500">
                {kpis.activeSubscriptions}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Aktif</span>
              <span className="text-muted-foreground/40 font-light">/</span>
              <span className="text-lg sm:text-xl lg:text-2xl font-semibold tracking-tight tabular-nums text-sky-500">
                {kpis.activeTrials}
              </span>
              <span className="text-xs font-medium text-muted-foreground">Trial</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50 truncate">
            {kpis.gracePeriodSubscriptions} masa tenggang · {kpis.suspendedSubscriptions} ditangguhkan
          </p>
        </div>

        {/* Secondary Stat 1: Pending Payments */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-2 sm:mb-3">
              <span className="text-xs font-semibold text-foreground/80 truncate">Pembayaran Menunggu</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight tabular-nums text-amber-500 truncate">
              {kpis.pendingPaymentsCount > 0 ? formatIDR(kpis.pendingPaymentsTotalIdr) : "Rp 0"}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50 truncate">
            {kpis.pendingPaymentsCount} bukti transfer perlu verifikasi
          </p>
        </div>

        {/* Secondary Stat 2: Ledger Transaction Volume */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-muted-foreground mb-2 sm:mb-3">
              <span className="text-xs font-semibold text-foreground/80 truncate">Volume Ledger Omset</span>
              <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight tabular-nums text-foreground truncate">
              {formatIDR(kpis.totalRevenueVolumeIdr)}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50 truncate">
            {kpis.totalTransactionsCount} total transaksi tercatat
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. CHANNEL HEALTH (Operational Status Row)
      ────────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border space-y-3 min-w-0">
        <div className="flex items-center justify-between min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
            Status Kanal Integrasi Platform
          </span>
          <Link
            href="/admin/system"
            className="text-xs text-primary hover:underline font-medium shrink-0 ml-2"
          >
            Detail Arsitektur &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Telegram */}
          <div className="px-3.5 py-3 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Telegram Pilot Bot</p>
                <p className="text-[11px] text-muted-foreground truncate">Kanal kasir utama</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                Aktif
              </span>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {kpis.connectedChannels.telegramCount} tenant
              </p>
            </div>
          </div>

          {/* Google Sheets */}
          <div className="px-3.5 py-3 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Google Sheets Sync</p>
                <p className="text-[11px] text-muted-foreground truncate">Cermin spreadsheet</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                Sinkron
              </span>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                {kpis.googleSheetsConnectedCount} terhubung
              </p>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="px-3.5 py-3 rounded-xl bg-muted/30 border border-border/80 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">WhatsApp Cloud API</p>
                <p className="text-[11px] text-muted-foreground truncate">Implementasi Step 8</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Deferred
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fase lanjutan</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MAIN GRID: RECENT BUSINESSES & PENDING PAYMENTS
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Recent Businesses */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-border min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-bold text-foreground truncate">Bisnis Klien Terbaru</h2>
              </div>
              <Link
                href="/admin/businesses"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Semua Bisnis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {recentBusinesses.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Belum ada bisnis terdaftar.
                </p>
              ) : (
                recentBusinesses.map((biz) => {
                  let statusBadge = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                  if (biz.subscriptionStatus === "trialing") {
                    statusBadge = "bg-sky-500/10 text-sky-500 border-sky-500/20";
                  } else if (biz.subscriptionStatus === "grace_period") {
                    statusBadge = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                  } else if (biz.subscriptionStatus === "suspended") {
                    statusBadge = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                  }

                  return (
                    <div key={biz.id} className="py-2.5 flex items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/businesses/${biz.id}`}
                          className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block"
                          title={biz.name}
                        >
                          {biz.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate">
                          Paket: <span className="font-medium text-foreground">{biz.planName}</span> · Sisa:{" "}
                          <span className="font-mono text-foreground font-semibold">{biz.remainingDays} hari</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${statusBadge}`}
                        >
                          {biz.subscriptionStatus}
                        </span>
                        <Link
                          href={`/admin/businesses/${biz.id}`}
                          className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Lihat Detail"
                          aria-label={`Detail ${biz.name}`}
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/admin/businesses"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Kelola total {businesses.length} tenant &rarr;
            </Link>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 flex flex-col justify-between min-w-0">
          <div className="min-w-0">
            <div className="flex items-center justify-between pb-3 border-b border-border min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Receipt className="w-4 h-4 text-amber-500 shrink-0" />
                <h2 className="text-sm font-bold text-foreground truncate">Pembayaran Menunggu Konfirmasi</h2>
              </div>
              <Link
                href="/admin/payments"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Semua Pembayaran</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border/60">
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                  <p className="text-xs font-medium text-foreground">Tidak ada pembayaran menunggu</p>
                  <p className="text-[11px]">Seluruh bukti transfer telah diverifikasi operator.</p>
                </div>
              ) : (
                pendingPayments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate" title={p.businessName}>
                        {p.businessName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Ref: <span className="font-mono text-foreground">{p.reference || "-"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {formatIDR(p.amountIdr)}
                      </span>
                      <Link
                        href="/admin/payments"
                        className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-colors"
                      >
                        Proses
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 text-right">
            <Link
              href="/admin/payments"
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Lihat seluruh riwayat bayar &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. AUDIT LOG STREAM
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-3.5 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-border min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
            <h2 className="text-sm font-bold text-foreground truncate">Aktivitas Platform & Audit Trail</h2>
          </div>
          <Link
            href="/admin/audit"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <span>Log Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-2 font-medium">Waktu</th>
                <th className="pb-2 font-medium">Aksi</th>
                <th className="pb-2 font-medium">Operator</th>
                <th className="pb-2 font-medium">Status Baru</th>
                <th className="pb-2 font-medium">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted-foreground">
                    Belum ada log audit tercatat.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("id-ID", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2.5 font-mono font-semibold text-foreground">{log.action}</td>
                    <td className="py-2.5 text-muted-foreground text-xs truncate max-w-[160px]" title={log.actor_email || log.actor_user_id || "System"}>
                      {log.actor_email || formatShortId(log.actor_user_id) || "System"}
                    </td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground border border-border">
                        {log.new_status}
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground truncate max-w-xs">{log.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-border/60 space-y-2">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Belum ada log audit tercatat.
            </p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="pt-2.5 first:pt-0 space-y-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] gap-2 min-w-0">
                  <span className="font-mono font-semibold text-foreground truncate">{log.action}</span>
                  <span className="font-mono text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 min-w-0">
                  <span className="truncate max-w-[180px] font-mono text-[11px]" title={log.actor_email || log.actor_user_id || "System"}>
                    {log.actor_email || formatShortId(log.actor_user_id) || "System"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-foreground shrink-0">
                    {log.new_status}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-[11px] text-muted-foreground/80 italic break-words">{log.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
