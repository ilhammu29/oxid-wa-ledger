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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AKTIF
          </span>
        );
      case "DISABLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-zinc-400 border border-white/10">
            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            NONAKTIF
          </span>
        );
      case "NOT READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            BELUM SIAP
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
            PERINGATAN
          </span>
        );
      case "ERROR":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            GANGGUAN
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Activity className="w-6 h-6 text-purple-400" />
          Monitoring & Kesehatan Bot
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Visibilitas status channel perpesanan, aktivitas transaksi, scheduler pengingat, dan peninjauan pesan parser.
        </p>
      </div>

      {actionError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* 1. CHANNEL STATUS & DOWNSTREAM SYNC (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telegram Card */}
        <div className="p-5 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Telegram Bot</h3>
                <p className="text-[11px] text-zinc-400">Adapter Operasional</p>
              </div>
            </div>
            {getStatusBadge(data.channels.telegram.status)}
          </div>
          <p className="text-xs text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
            {data.channels.telegram.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Pesan Masuk
              </span>
              <span className="text-zinc-200 font-mono text-[11px]">
                {formatDateTime(data.channels.telegram.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Balasan Outbound
              </span>
              <span className="text-zinc-200 font-mono text-[11px]">
                {formatDateTime(data.channels.telegram.lastOutbound)}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="p-5 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Meta WhatsApp Cloud</h3>
                <p className="text-[11px] text-zinc-400">Integrasi Webhook</p>
              </div>
            </div>
            {getStatusBadge(data.channels.whatsapp.status)}
          </div>
          <p className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
            {data.channels.whatsapp.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Pesan Masuk
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {formatDateTime(data.channels.whatsapp.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Balasan Outbound
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {formatDateTime(data.channels.whatsapp.lastOutbound)}
              </span>
            </div>
          </div>
        </div>

        {/* Google Sheets Card */}
        <div className="p-5 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Google Sheets</h3>
                <p className="text-[11px] text-zinc-400">One-Way Sync Mirror</p>
              </div>
            </div>
            {data.googleSheets.status === "CONNECTED" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> TERHUBUNG
              </span>
            )}
            {data.googleSheets.status === "DISABLED" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-zinc-400 border border-white/10">
                <XCircle className="w-3.5 h-3.5 text-zinc-500" /> NONAKTIF
              </span>
            )}
            {data.googleSheets.status === "ERROR" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> GANGGUAN
              </span>
            )}
            {data.googleSheets.status === "NOT CONFIGURED" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-zinc-400 border border-white/10">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> BELUM TERHUBUNG
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-300 bg-white/5 p-3 rounded-xl border border-white/5 truncate">
            {data.googleSheets.spreadsheetTitle ||
              (data.googleSheets.status === "NOT CONFIGURED"
                ? "Belum ada spreadsheet terhubung"
                : "Spreadsheet mirror")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Sinkronisasi Terakhir
              </span>
              <span className="text-zinc-200 font-mono text-[11px]">
                {formatDateTime(data.googleSheets.lastSyncAt)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500 block mb-0.5">
                Status Antrean
              </span>
              <span className="text-zinc-200 font-mono text-[11px]">
                {data.googleSheets.pendingSync ? "Menunggu Worker" : "Tersinkronisasi"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LAST ACTIVITY & SCHEDULER HEALTH (2 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last Activity Card */}
        <div className="p-5 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">
              Ringkasan Aktivitas Terkini
            </h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-zinc-400">Pesan Masuk Terakhir</span>
              <span className="font-mono text-zinc-200 text-xs">
                {formatDateTime(data.lastActivity.lastInbound)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-zinc-400">Balasan Outbound Terakhir</span>
              <span className="font-mono text-zinc-200 text-xs">
                {formatDateTime(data.lastActivity.lastOutbound)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-zinc-400">Perintah Bisnis Berhasil</span>
              <span className="font-mono text-emerald-400 font-semibold text-xs">
                {formatDateTime(data.lastActivity.lastSuccessfulCommand)}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Health Card */}
        <div className="p-5 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="font-bold text-white text-sm">
              Scheduler Pengingat Harian (Cron)
            </h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-zinc-400">Eksekusi Scheduler Terakhir</span>
              <span className="font-mono text-zinc-200 text-xs">
                {formatDateTime(data.scheduler.lastRun)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-zinc-400">Pengingat Terkirim Terakhir</span>
              <span className="font-mono text-zinc-200 text-xs">
                {formatDateTime(data.scheduler.lastSuccess)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                  Bisnis Dicek
                </span>
                <span className="font-bold text-white text-base font-mono">
                  {data.scheduler.businessesChecked}
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                  Terkirim
                </span>
                <span className="font-bold text-emerald-400 text-base font-mono">
                  {data.scheduler.notificationsSent}
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block mb-0.5">
                  Gagal
                </span>
                <span className="font-bold text-rose-400 text-base font-mono">
                  {data.scheduler.notificationsFailed}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MESSAGES NEEDING REVIEW (STEP 7A PILOT HARDENING) */}
      <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-base">
                Pesan Perlu Ditinjau (Pilot Hardening)
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Pesan dari operator resmi yang tidak dapat dipahami oleh parser deterministic.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-auto">
            {failures.length} Menunggu Peninjauan
          </span>
        </div>

        {failures.length === 0 ? (
          <div className="py-10 text-center bg-white/[0.02] rounded-xl border border-white/5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Tidak ada pesan yang perlu ditinjau saat ini</p>
            <p className="text-xs text-zinc-400 mt-1">Semua pesan dari operator berhasil diproses dengan aman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 bg-white/[0.02] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3.5">Channel</th>
                  <th className="py-3 px-3.5">Pesan Operator</th>
                  <th className="py-3 px-3.5">Alasan Gagal</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {failures.map((f) => (
                  <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3.5 font-mono text-zinc-300 whitespace-nowrap">
                      {formatDateTime(f.createdAt)}
                    </td>
                    <td className="py-3 px-3.5 uppercase text-purple-300 font-semibold">
                      {f.channel}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-zinc-200 max-w-xs truncate">
                      &quot;{f.messageText}&quot;
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[11px] font-mono border border-amber-500/30">
                        {f.failureType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {role === "owner" || role === "admin" ? (
                        <button
                          onClick={() => handleMarkReviewed(f.id)}
                          disabled={loadingId === f.id}
                          className="px-3 py-1 bg-white/5 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 rounded-lg text-xs font-medium border border-white/10 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {loadingId === f.id ? "Menyimpan..." : "Tandai Sudah Ditinjau"}
                        </button>
                      ) : (
                        <span className="text-zinc-500 text-xs">Akses Khusus Admin</span>
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
      <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="font-bold text-white text-base">
            20 Kesalahan Terakhir (Sanitized Telemetry)
          </h3>
        </div>
        {data.recentErrors.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">Tidak ada catatan kegagalan sistem terkini.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 bg-white/[0.02] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3.5">Channel</th>
                  <th className="py-3 px-3.5">Arah</th>
                  <th className="py-3 px-3.5">Tipe Event</th>
                  <th className="py-3 px-3.5">Kode Kesalahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-zinc-400 whitespace-nowrap">
                      {formatDateTime(err.createdAt)}
                    </td>
                    <td className="py-2.5 px-3.5 uppercase text-zinc-300 font-semibold">{err.channel}</td>
                    <td className="py-2.5 px-3.5 capitalize text-zinc-400">{err.direction}</td>
                    <td className="py-2.5 px-3.5 font-mono text-zinc-300">{err.eventType}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
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
