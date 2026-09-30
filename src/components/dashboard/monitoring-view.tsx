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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> AKTIF
          </span>
        );
      case "DISABLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3.5 h-3.5" /> NONAKTIF
          </span>
        );
      case "NOT READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> BELUM SIAP
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> PERINGATAN
          </span>
        );
      case "ERROR":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> GANGGUAN
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" /> Monitoring & Kesehatan Bot
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Visibilitas status channel perpesanan, aktivitas transaksi, scheduler pengingat, dan peninjauan pesan parser.
        </p>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
          {actionError}
        </div>
      )}

      {/* 1. CHANNEL STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telegram Card */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">Telegram Bot</h3>
                <p className="text-xs text-zinc-400">Adapter Operasional</p>
              </div>
            </div>
            {getStatusBadge(data.channels.telegram.status)}
          </div>
          <p className="text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
            {data.channels.telegram.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800">
            <div>
              <span className="text-zinc-500 block">Pesan Masuk Terakhir</span>
              <span className="text-zinc-300 font-mono">
                {formatDateTime(data.channels.telegram.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Balasan Terakhir</span>
              <span className="text-zinc-300 font-mono">
                {formatDateTime(data.channels.telegram.lastOutbound)}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100">Meta WhatsApp Cloud</h3>
                <p className="text-xs text-zinc-400">Integrasi Webhook</p>
              </div>
            </div>
            {getStatusBadge(data.channels.whatsapp.status)}
          </div>
          <p className="text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800">
            {data.channels.whatsapp.detail}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-zinc-800">
            <div>
              <span className="text-zinc-500 block">Pesan Masuk Terakhir</span>
              <span className="text-zinc-300 font-mono">
                {formatDateTime(data.channels.whatsapp.lastInbound)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block">Balasan Terakhir</span>
              <span className="text-zinc-300 font-mono">
                {formatDateTime(data.channels.whatsapp.lastOutbound)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LAST ACTIVITY & SCHEDULER HEALTH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Last Activity Card */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
          <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-emerald-400" /> Ringkasan Aktivitas Terkini
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
              <span className="text-zinc-400">Pesan Masuk Terakhir (Semua Channel)</span>
              <span className="font-mono text-zinc-200">
                {formatDateTime(data.lastActivity.lastInbound)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
              <span className="text-zinc-400">Balasan Outbound Terakhir</span>
              <span className="font-mono text-zinc-200">
                {formatDateTime(data.lastActivity.lastOutbound)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-400">Perintah Bisnis Berhasil Terakhir</span>
              <span className="font-mono text-emerald-400 font-medium">
                {formatDateTime(data.lastActivity.lastSuccessfulCommand)}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduler Health Card */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
          <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4 text-emerald-400" /> Scheduler Pengingat (Cron)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
              <span className="text-zinc-400">Eksekusi Scheduler Terakhir</span>
              <span className="font-mono text-zinc-200">
                {formatDateTime(data.scheduler.lastRun)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
              <span className="text-zinc-400">Pengingat Terkirim Terakhir</span>
              <span className="font-mono text-zinc-200">
                {formatDateTime(data.scheduler.lastSuccess)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Bisnis Dicek</span>
                <span className="font-bold text-zinc-100">{data.scheduler.businessesChecked}</span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Terkirim</span>
                <span className="font-bold text-emerald-400">{data.scheduler.notificationsSent}</span>
              </div>
              <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Gagal</span>
                <span className="font-bold text-rose-400">{data.scheduler.notificationsFailed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MESSAGES NEEDING REVIEW (STEP 7A) */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" /> Pesan Perlu Ditinjau (Pilot Hardening)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pesan dari operator resmi yang tidak dapat dipahami oleh parser deterministic.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {failures.length} Menunggu Peninjauan
          </span>
        </div>

        {failures.length === 0 ? (
          <div className="p-8 text-center bg-zinc-950/40 rounded-xl border border-zinc-800/80">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">Tidak ada pesan yang perlu ditinjau saat ini.</p>
            <p className="text-xs text-zinc-600 mt-1">Semua pesan dari operator berhasil diproses dengan aman.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/50">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Pesan Operator</th>
                  <th className="py-2.5 px-3">Alasan Gagal</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {failures.map((f) => (
                  <tr key={f.id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-3 px-3 font-mono text-zinc-400 whitespace-nowrap">
                      {formatDateTime(f.createdAt)}
                    </td>
                    <td className="py-3 px-3 uppercase text-zinc-300 font-semibold">
                      {f.channel}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-200 max-w-xs truncate">
                      "{f.messageText}"
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 text-[11px] font-mono border border-zinc-700">
                        {f.failureType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {role === "owner" || role === "admin" ? (
                        <button
                          onClick={() => handleMarkReviewed(f.id)}
                          disabled={loadingId === f.id}
                          className="px-3 py-1 bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {loadingId === f.id ? "Menyimpan..." : "Tandai Sudah Ditinjau"}
                        </button>
                      ) : (
                        <span className="text-zinc-600 text-xs">Akses Khusus Admin</span>
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
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 text-sm">
          <ShieldAlert className="w-4 h-4 text-rose-400" /> 20 Kesalahan Terakhir (Sanitized Telemetry)
        </h3>
        {data.recentErrors.length === 0 ? (
          <p className="text-xs text-zinc-500 italic">Tidak ada catatan kegagalan sistem terkini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/50">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Arah</th>
                  <th className="py-2.5 px-3">Tipe Event</th>
                  <th className="py-2.5 px-3">Kode Kesalahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.recentErrors.map((err) => (
                  <tr key={err.id} className="hover:bg-zinc-800/20">
                    <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                      {formatDateTime(err.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-zinc-300 font-semibold">{err.channel}</td>
                    <td className="py-2.5 px-3 capitalize text-zinc-400">{err.direction}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{err.eventType}</td>
                    <td className="py-2.5 px-3">
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
