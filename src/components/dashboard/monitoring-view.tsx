"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  ShieldAlert,
  XCircle,
  Eye,
  Check,
  FileSpreadsheet,
  Zap,
} from "lucide-react";
import { markFailureReviewedAction } from "@/app/dashboard/actions";
import { MonitoringData } from "@/modules/monitoring";

interface MonitoringViewProps {
  data: MonitoringData;
  role: "owner" | "admin" | "member";
  timezone: string;
}

export function MonitoringView({ data, role, timezone }: MonitoringViewProps) {
  const [failures, setFailures] = useState(data.pendingFailures);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(isoString));
  };

  const handleMarkReviewed = async (id: string) => {
    setLoadingId(id);
    setActionError(null);
    try {
      const res = await markFailureReviewedAction(id);
      if (res.success) {
        setFailures((prev) => prev.filter((f) => f.id !== id));
      } else {
        setActionError(res.error || "Gagal menandai pesan.");
      }
    } catch {
      setActionError("Terjadi kesalahan jaringan.");
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
          </span>
        );
      case "DISABLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
            <XCircle className="w-3 h-3 text-muted-foreground" />
            Nonaktif
          </span>
        );
      case "NOT READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Belum Siap
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            Peringatan
          </span>
        );
      case "ERROR":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3 text-rose-500" />
            Gangguan
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Monitoring & Kesehatan Sistem
        </h1>
        <p className="text-xs text-muted mt-1">
          Status kanal perpesanan, worker sinkronisasi, cron scheduler, dan telemetri parser transaksi.
        </p>
      </div>

      {actionError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 1. CHANNEL & INTEGRATION STATUS (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telegram Card */}
        <div className="card-base bg-surface border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-md flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs">Telegram Bot</h3>
                <p className="text-[11px] text-muted">Adapter Utama</p>
              </div>
            </div>
            {getStatusBadge(data.channels.telegram.status)}
          </div>
          <p className="text-xs text-muted bg-secondary/50 p-2.5 rounded-md border border-border leading-relaxed">
            {data.channels.telegram.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Pesan Masuk
              </span>
              <span className="text-foreground font-mono text-[11px]">
                {formatDateTime(data.channels.telegram.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Balasan Keluar
              </span>
              <span className="text-foreground font-mono text-[11px]">
                {formatDateTime(data.channels.telegram.lastOutbound)}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="card-base bg-surface border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-secondary text-muted-foreground rounded-md flex items-center justify-center shrink-0">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs">Meta WhatsApp Cloud</h3>
                <p className="text-[11px] text-muted">Integrasi Webhook</p>
              </div>
            </div>
            {getStatusBadge(data.channels.whatsapp.status)}
          </div>
          <p className="text-xs text-muted bg-secondary/50 p-2.5 rounded-md border border-border leading-relaxed">
            {data.channels.whatsapp.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Pesan Masuk
              </span>
              <span className="text-muted font-mono text-[11px]">
                {formatDateTime(data.channels.whatsapp.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Balasan Keluar
              </span>
              <span className="text-muted font-mono text-[11px]">
                {formatDateTime(data.channels.whatsapp.lastOutbound)}
              </span>
            </div>
          </div>
        </div>

        {/* Google Sheets Card */}
        <div className="card-base bg-surface border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-xs">Google Sheets</h3>
                <p className="text-[11px] text-muted">Mirror Otomatis</p>
              </div>
            </div>
            {data.googleSheets.status === "CONNECTED" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Terhubung
              </span>
            )}
            {data.googleSheets.status === "DISABLED" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
                <XCircle className="w-3 h-3 text-muted-foreground" /> Nonaktif
              </span>
            )}
            {data.googleSheets.status === "ERROR" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                <ShieldAlert className="w-3 h-3 text-rose-500" /> Gangguan
              </span>
            )}
            {data.googleSheets.status === "NOT CONFIGURED" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
                Belum Terhubung
              </span>
            )}
          </div>
          <p className="text-xs text-muted bg-secondary/50 p-2.5 rounded-md border border-border truncate">
            {data.googleSheets.spreadsheetTitle ||
              (data.googleSheets.status === "NOT CONFIGURED"
                ? "Belum ada spreadsheet terhubung"
                : "Spreadsheet mirror")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Sinkronisasi Terakhir
              </span>
              <span className="text-foreground font-mono text-[11px]">
                {formatDateTime(data.googleSheets.lastSyncAt)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-medium text-muted block">
                Status Antrean
              </span>
              <span className="text-foreground font-mono text-[11px]">
                {data.googleSheets.pendingSync ? "Menunggu Worker" : "Sinkron"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ACTIVITY & SCHEDULER (2 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Summary Card */}
        <div className="card-base bg-surface border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-xs">
              Ringkasan Aktivitas Terkini
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-muted">Pesan Masuk Terakhir</span>
              <span className="font-mono text-foreground text-xs">
                {formatDateTime(data.lastActivity.lastInbound)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-muted">Balasan Keluar Terakhir</span>
              <span className="font-mono text-foreground text-xs">
                {formatDateTime(data.lastActivity.lastOutbound)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted">Perintah Ledger Terkonfirmasi</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                {formatDateTime(data.lastActivity.lastSuccessfulCommand)}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Health Card */}
        <div className="card-base bg-surface border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-xs">
              Scheduler Pengingat Harian (Cron)
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-muted">Eksekusi Scheduler Terakhir</span>
              <span className="font-mono text-foreground text-xs">
                {formatDateTime(data.scheduler.lastRun)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-border">
              <span className="text-muted">Pengingat Terkirim Terakhir</span>
              <span className="font-mono text-foreground text-xs">
                {formatDateTime(data.scheduler.lastSuccess)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-secondary/60 p-2 rounded-md border border-border">
                <span className="text-[10px] uppercase text-muted block mb-0.5">
                  Dicek
                </span>
                <span className="font-semibold text-foreground text-sm font-mono">
                  {data.scheduler.businessesChecked}
                </span>
              </div>
              <div className="bg-secondary/60 p-2 rounded-md border border-border">
                <span className="text-[10px] uppercase text-muted block mb-0.5">
                  Terkirim
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                  {data.scheduler.notificationsSent}
                </span>
              </div>
              <div className="bg-secondary/60 p-2 rounded-md border border-border">
                <span className="text-[10px] uppercase text-muted block mb-0.5">
                  Gagal
                </span>
                <span className="font-semibold text-rose-600 dark:text-rose-400 text-sm font-mono">
                  {data.scheduler.notificationsFailed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MESSAGES NEEDING REVIEW (PILOT HARDENING) */}
      <div className="card-base bg-surface border-border p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-foreground text-sm">
                Pesan Perlu Ditinjau (Pilot Hardening)
              </h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Pesan dari operator resmi yang tidak dapat diuraikan oleh parser deterministic.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 self-start sm:self-auto">
            {failures.length} Menunggu Peninjauan
          </span>
        </div>

        {failures.length === 0 ? (
          <div className="py-8 text-center bg-secondary/30 rounded-lg border border-border">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-foreground">Tidak ada pesan yang perlu ditinjau</p>
            <p className="text-[11px] text-muted mt-0.5">Semua pesan dari operator berhasil diproses dengan aman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted bg-secondary/50 uppercase font-medium text-[11px]">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Kanal</th>
                  <th className="py-2.5 px-3">Pesan Operator</th>
                  <th className="py-2.5 px-3">Alasan Gagal</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {failures.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-mono text-muted whitespace-nowrap">
                      {formatDateTime(f.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-primary font-medium">
                      {f.channel}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground max-w-xs truncate">
                      &quot;{f.messageText}&quot;
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-mono border border-amber-500/20">
                        {f.failureType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {role === "owner" || role === "admin" ? (
                        <button
                          onClick={() => handleMarkReviewed(f.id)}
                          disabled={loadingId === f.id}
                          className="px-2.5 py-1 bg-secondary hover:bg-emerald-500 hover:text-white text-foreground rounded text-xs font-medium border border-border transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          {loadingId === f.id ? "Menyimpan..." : "Tandai Ditinjau"}
                        </button>
                      ) : (
                        <span className="text-muted text-xs">Akses Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. RECENT 20 ERRORS (TELEMETRY) */}
      <div className="card-base bg-surface border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <h3 className="font-semibold text-foreground text-sm">
            20 Kesalahan Terakhir (Sanitized Telemetry)
          </h3>
        </div>
        {data.recentErrors.length === 0 ? (
          <p className="text-xs text-muted italic">Tidak ada catatan kegagalan sistem terkini.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted bg-secondary/50 uppercase font-medium text-[11px]">
                  <th className="py-2 px-3">Waktu</th>
                  <th className="py-2 px-3">Kanal</th>
                  <th className="py-2 px-3">Arah</th>
                  <th className="py-2 px-3">Tipe Event</th>
                  <th className="py-2 px-3">Kode Kesalahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.recentErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2 px-3 font-mono text-muted whitespace-nowrap">
                      {formatDateTime(err.createdAt)}
                    </td>
                    <td className="py-2 px-3 uppercase text-foreground font-medium">{err.channel}</td>
                    <td className="py-2 px-3 capitalize text-muted">{err.direction}</td>
                    <td className="py-2 px-3 font-mono text-foreground">{err.eventType}</td>
                    <td className="py-2 px-3">
                      <span className="text-rose-600 dark:text-rose-400 font-mono bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[11px]">
                        {err.errorCode || "UNSPECIFIED"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
