"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  testGoogleSheetsConnectionAction,
  saveGoogleSheetsConnectionAction,
  triggerManualSyncAction,
  getGoogleSheetsSyncStatusAction,
} from "@/app/dashboard/actions";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ShieldCheck,
  Sparkles,
  Info,
  Clock,
  Layers,
  Database,
} from "lucide-react";

export interface GoogleSheetsViewProps {
  connection: {
    enabled: boolean;
    spreadsheet_id: string | null;
    spreadsheet_title: string | null;
    sync_interval_minutes: number;
    last_sync_at: string | null;
    last_sync_status: string | null;
    last_error_code: string | null;
    last_error_message: string | null;
  } | null;
  pendingJob: {
    id: string;
    status: string;
    reason: string;
    created_at: string;
  } | null;
  recentRuns: Array<{
    id: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    rows_transactions: number;
    rows_products: number;
    rows_daily_status: number;
    error_code: string | null;
    error_message: string | null;
  }>;
  isServerConfigured: boolean;
  serviceAccountEmail: string | null;
  role: string;
}

function getFriendlyErrorMessage(code: string | null, rawMessage: string | null): string {
  if (!code) return rawMessage || "Terjadi kesalahan yang tidak diketahui.";
  switch (code) {
    case "PERMISSION_DENIED":
      return "Izin akses ditolak. Pastikan email Service Account telah ditambahkan sebagai Editor di spreadsheet ini.";
    case "SPREADSHEET_NOT_FOUND":
      return "Spreadsheet tidak ditemukan. Periksa kembali tautan Google Spreadsheet Anda.";
    case "GOOGLE_AUTH_ERROR":
      return "Autentikasi Service Account gagal. Periksa konfigurasi kredensial Google pada server.";
    case "RATE_LIMIT_EXCEEDED":
      return "Batas kuota Google Sheets API tercapai. Sinkronisasi akan dicoba ulang secara otomatis.";
    case "GOOGLE_API_UNAVAILABLE":
      return "Layanan Google Sheets sementara tidak tersedia. Sinkronisasi akan dicoba kembali.";
    default:
      return rawMessage || `Terjadi kesalahan dengan kode: ${code}`;
  }
}

export function GoogleSheetsView({
  connection: initialConnection,
  pendingJob: initialPendingJob,
  recentRuns: initialRecentRuns,
  isServerConfigured,
  serviceAccountEmail,
  role,
}: GoogleSheetsViewProps) {
  const router = useRouter();

  // Polling override state
  const [overrideConnection, setOverrideConnection] = useState<typeof initialConnection | null>(null);
  const [overridePendingJob, setOverridePendingJob] = useState<typeof initialPendingJob | null>(null);
  const [overrideRecentRuns, setOverrideRecentRuns] = useState<typeof initialRecentRuns | null>(null);

  const liveConnection = overrideConnection ?? initialConnection;
  const livePendingJob = overridePendingJob ?? initialPendingJob;
  const liveRecentRuns = overrideRecentRuns ?? initialRecentRuns;

  const [spreadsheetInput, setSpreadsheetInput] = useState(
    initialConnection?.spreadsheet_id
      ? `https://docs.google.com/spreadsheets/d/${initialConnection.spreadsheet_id}/edit`
      : ""
  );
  const [enabled, setEnabled] = useState(initialConnection?.enabled ?? false);
  const [syncInterval, setSyncInterval] = useState(
    String(initialConnection?.sync_interval_minutes || 5)
  );

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    title?: string;
    error?: string;
  } | null>(null);

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const canEdit = role === "owner" || role === "admin";

  // Derive active syncing state
  const isSyncingActive =
    isManualSyncing ||
    Boolean(livePendingJob) ||
    liveConnection?.last_sync_status === "syncing";

  // Auto-polling effect when sync is active
  useEffect(() => {
    if (!isSyncingActive) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      try {
        const res = await getGoogleSheetsSyncStatusAction();
        if (res.success && res.data) {
          setOverrideConnection(res.data.connection);
          setOverridePendingJob(res.data.pendingJob);
          setOverrideRecentRuns(res.data.recentRuns);

          const finished =
            !res.data.pendingJob && res.data.connection?.last_sync_status !== "syncing";

          if (finished || pollCount >= 15) {
            clearInterval(interval);
            setIsManualSyncing(false);
            router.refresh();

            if (res.data.connection?.last_sync_status === "success") {
              setMessage({
                text: "Sinkronisasi berhasil! 5 lembar kerja telah diperbarui di Google Sheets.",
                type: "success",
              });
            } else if (res.data.connection?.last_sync_status === "failed") {
              setMessage({
                text: `Sinkronisasi gagal: [${res.data.connection.last_error_code || "ERROR"}] ${getFriendlyErrorMessage(
                  res.data.connection.last_error_code,
                  res.data.connection.last_error_message
                )}`,
                type: "error",
              });
            }
          }
        }
      } catch {
        if (pollCount >= 15) {
          clearInterval(interval);
          setIsManualSyncing(false);
        }
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isSyncingActive, router]);

  // Derive connection state badge
  let statusBadge: {
    label: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  } = {
    label: "NOT CONFIGURED",
    bg: "bg-white/5 border-white/10",
    text: "text-zinc-400",
    icon: Info,
  };

  if (!isServerConfigured) {
    statusBadge = {
      label: "SERVER UNCONFIGURED",
      bg: "bg-amber-500/15 border-amber-500/30",
      text: "text-amber-300",
      icon: AlertTriangle,
    };
  } else if (isSyncingActive) {
    statusBadge = {
      label: "SYNCING",
      bg: "bg-sky-500/15 border-sky-500/30",
      text: "text-sky-300",
      icon: RefreshCw,
    };
  } else if (!liveConnection?.spreadsheet_id) {
    statusBadge = {
      label: "NOT CONFIGURED",
      bg: "bg-white/5 border-white/10",
      text: "text-zinc-400",
      icon: Info,
    };
  } else if (!liveConnection.enabled) {
    statusBadge = {
      label: "DISABLED",
      bg: "bg-white/5 border-white/10",
      text: "text-zinc-400",
      icon: XCircle,
    };
  } else if (liveConnection.last_sync_status === "failed") {
    statusBadge = {
      label: "ERROR",
      bg: "bg-rose-500/15 border-rose-500/30",
      text: "text-rose-300",
      icon: XCircle,
    };
  } else if (liveConnection.last_sync_status === "success") {
    statusBadge = {
      label: "CONNECTED",
      bg: "bg-emerald-500/15 border-emerald-500/30",
      text: "text-emerald-300",
      icon: CheckCircle2,
    };
  }

  const handleCopyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!spreadsheetInput.trim()) {
      setTestResult({
        tested: true,
        success: false,
        error: "Masukkan URL atau Spreadsheet ID terlebih dahulu.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setMessage(null);

    try {
      const res = await testGoogleSheetsConnectionAction(spreadsheetInput.trim());
      if (res.success) {
        setTestResult({
          tested: true,
          success: true,
          title: res.data?.spreadsheetTitle || "Google Spreadsheet",
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          error: res.error || "Gagal menguji koneksi ke Google Sheets.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        tested: true,
        success: false,
        error: msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("enabled", String(enabled));
    formData.set("spreadsheetInput", spreadsheetInput);
    formData.set("syncIntervalMinutes", syncInterval);

    startTransition(async () => {
      const res = await saveGoogleSheetsConnectionAction(formData);
      if (res.success) {
        setMessage({
          text: enabled
            ? "Pengaturan berhasil disimpan! Sinkronisasi awal telah dijadwalkan ke antrean."
            : "Pengaturan berhasil disimpan.",
          type: "success",
        });
      } else {
        setMessage({
          text: res.error || "Gagal menyimpan pengaturan Google Sheets.",
          type: "error",
        });
      }
    });
  };

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setMessage(null);
    setOverrideConnection((prev) => {
      const base = prev ?? initialConnection;
      return base ? { ...base, last_sync_status: "syncing" } : null;
    });

    try {
      const res = await triggerManualSyncAction();
      if (res.success) {
        setMessage({
          text: "Sinkronisasi dimulai. Memperbarui lembar kerja Google Sheets...",
          type: "success",
        });
      } else {
        setIsManualSyncing(false);
        setMessage({
          text: res.error || "Gagal menjadwalkan sinkronisasi.",
          type: "error",
        });
      }
    } catch (err: unknown) {
      setIsManualSyncing(false);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: msg, type: "error" });
    }
  };

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top 4 Summary Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Status Koneksi */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status Koneksi
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.bg} ${statusBadge.text}`}
            >
              <StatusIcon className={`w-3.5 h-3.5 ${statusBadge.label === "SYNCING" ? "animate-spin" : ""}`} />
              {statusBadge.label}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {liveConnection?.enabled ? "Auto sync aktif" : "Auto sync nonaktif"}
          </div>
        </div>

        {/* Metric 2: Judul Spreadsheet */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Spreadsheet Target
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate" title={liveConnection?.spreadsheet_title || "Belum Dihubungkan"}>
            {liveConnection?.spreadsheet_title || "Belum Terhubung"}
          </div>
          <div className="mt-2 text-[11px] text-emerald-300">
            5 Lembar Kerja Mirror
          </div>
        </div>

        {/* Metric 3: Sinkronisasi Terakhir */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sinkronisasi Terakhir
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-white font-mono truncate">
            {liveConnection?.last_sync_at
              ? new Date(liveConnection.last_sync_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
              : "Belum Ada"}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 truncate">
            {liveConnection?.last_sync_at
              ? new Date(liveConnection.last_sync_at).toLocaleDateString("id-ID")
              : "Menunggu sinkronisasi"}
          </div>
        </div>

        {/* Metric 4: Antrean Worker */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status Antrean
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm sm:text-base font-bold text-white">
            {livePendingJob ? "Menunggu Worker" : "Up to Date"}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {syncInterval} menit interval
          </div>
        </div>
      </div>

      {/* Server Configuration Alert */}
      {!isServerConfigured && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Google Sheets belum dikonfigurasi pada server.</p>
            <p className="text-zinc-400 leading-relaxed">
              Environment variable <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-300">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> dan <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-300">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> belum tersedia pada runtime server. Aplikasi tetap berfungsi normal, namun sinkronisasi Google Sheets ditangguhkan.
            </p>
          </div>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                {liveConnection?.spreadsheet_title || "Google Spreadsheet Mirror"}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text}`}
              >
                <StatusIcon className={`w-3.5 h-3.5 ${statusBadge.label === "SYNCING" ? "animate-spin" : ""}`} />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {liveConnection?.last_sync_at
                ? `Terakhir disinkronkan: ${new Date(liveConnection.last_sync_at).toLocaleString("id-ID")}`
                : "Belum pernah disinkronkan"}
            </p>
            {liveRecentRuns.length > 0 && liveRecentRuns[0].status === "success" && (
              <p className="text-[11px] text-emerald-400 font-medium mt-1">
                ✓ Berhasil menyinkronkan {liveRecentRuns[0].rows_transactions} transaksi, {liveRecentRuns[0].rows_products} produk, {liveRecentRuns[0].rows_daily_status} status harian.
              </p>
            )}
          </div>
        </div>

        {/* Action: Manual Sync Button */}
        <button
          type="button"
          onClick={handleManualSync}
          disabled={!liveConnection?.enabled || !liveConnection?.spreadsheet_id || isSyncingActive || isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncingActive ? "animate-spin" : ""}`} />
          <span>{isSyncingActive ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
        </button>
      </div>

      {/* Error Callout Alert Banner */}
      {liveConnection?.last_sync_status === "failed" && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300 space-y-1">
            <p className="font-semibold text-white">Sinkronisasi Terakhir Mengalami Kendala</p>
            <p>{getFriendlyErrorMessage(liveConnection.last_error_code, liveConnection.last_error_message)}</p>
            {liveConnection.last_error_code === "PERMISSION_DENIED" && serviceAccountEmail && (
              <p className="text-[11px] text-zinc-300 mt-1">
                Solusi: Buka spreadsheet Anda, klik tombol <strong>Bagikan (Share)</strong>, lalu tambahkan <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-purple-300">{serviceAccountEmail}</code> sebagai <strong>Editor</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Operator Setup Guide Box */}
      <div className="p-5 sm:p-6 bg-[#090D16] text-white rounded-2xl space-y-3.5 border border-purple-500/20 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          Panduan Pengaturan Klien (3 Langkah Mudah)
        </div>
        <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Buat spreadsheet baru di Google Drive Anda (misal: <em>Buku Kas OXID Ledger</em>).
          </li>
          <li>
            Buka spreadsheet, klik tombol <strong>Bagikan (Share)</strong>, lalu tambahkan email Service Account berikut sebagai <strong>Editor</strong>:
            <div className="mt-2 flex items-center gap-2 bg-[#111726] border border-white/10 px-3.5 py-2 rounded-xl font-mono text-xs text-purple-300">
              <span className="truncate">{serviceAccountEmail || "Belum dikonfigurasi"}</span>
              {serviceAccountEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-2 py-0.5 rounded bg-white/5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedEmail ? "Tersalin!" : "Salin"}</span>
                </button>
              )}
            </div>
          </li>
          <li>
            Salin tautan spreadsheet dari browser Anda, tempelkan ke kolom di bawah, klik <strong>Test Connection</strong>, lalu <strong>Simpan Pengaturan</strong>.
          </li>
        </ol>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Konfigurasi Spreadsheet
          </h3>

          {/* Spreadsheet URL / ID Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Tautan Google Spreadsheet atau Spreadsheet ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={spreadsheetInput}
                onChange={(e) => setSpreadsheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                disabled={!canEdit || isPending}
                className="flex-1 px-3.5 py-2.5 text-xs border border-white/10 rounded-xl bg-white/5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono disabled:opacity-50 transition"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!canEdit || isTesting || !spreadsheetInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white rounded-xl transition shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>{isTesting ? "Memeriksa..." : "Test Connection"}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              Hanya domain resmi <code className="text-purple-300 font-mono">docs.google.com</code> yang diterima demi keamanan.
            </p>

            {/* Test Connection Result Box */}
            {testResult?.tested && (
              <div
                className={`mt-2 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-white">
                    {testResult.success ? "Koneksi Berhasil!" : "Koneksi Gagal"}
                  </p>
                  <p className="text-[11px] mt-0.5">
                    {testResult.success
                      ? `Spreadsheet "${testResult.title}" terverifikasi dan siap disinkronkan.`
                      : testResult.error}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Automatic Sync Switch */}
          <div className="pt-3 flex items-center justify-between border-t border-white/5">
            <div>
              <p className="text-xs font-semibold text-white">Sinkronisasi Otomatis</p>
              <p className="text-[11px] text-zinc-400">
                Otomatis memperbarui spreadsheet setiap ada transaksi atau perubahan status bisnis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => canEdit && setEnabled(!enabled)}
              disabled={!canEdit || isPending}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
                enabled ? "bg-purple-600 shadow-md shadow-purple-900/40" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                  enabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Sync Interval Selector */}
          <div className="pt-3 space-y-2 border-t border-white/5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Interval Rekonsiliasi Otomatis (Periodic Reconciliation)
            </label>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              disabled={!canEdit || isPending}
              className="px-3.5 py-2.5 text-xs border border-white/10 rounded-xl bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="5" className="bg-[#111726] text-white">Setiap 5 Menit (Direkomendasikan)</option>
              <option value="15" className="bg-[#111726] text-white">Setiap 15 Menit</option>
              <option value="30" className="bg-[#111726] text-white">Setiap 30 Menit</option>
              <option value="60" className="bg-[#111726] text-white">Setiap 60 Menit (1 Jam)</option>
            </select>
            <p className="text-[11px] text-zinc-500">
              Memastikan lembar laporan tetap selaras jika ada event sinkronisasi yang tertunda.
            </p>
          </div>
        </div>

        {/* Managed Worksheets Notice */}
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Info className="w-4 h-4 text-purple-400" />
            Lembar Kerja yang Dikelola OXID (Managed Worksheets)
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            OXID hanya mengelola 5 lembar kerja: <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-mono">Dashboard</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-mono">Transactions</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-mono">Products</code>, <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-mono">Daily_Status</code>, dan <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 font-mono">Config</code>. Lembar buatan Anda sendiri (misal: <em>Catatan Pribadi</em>) tidak akan disentuh atau dihapus.
          </p>
        </div>

        {/* Disclaimer / Single Source of Truth Notice */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Pemberitahuan Penting:</strong> Supabase tetap menjadi satu-satunya sumber utama (*single source of truth*) data keuangan. Perubahan manual yang Anda buat langsung di Google Sheets <strong>tidak akan mengubah</strong> data di OXID Ledger dan dapat ditimpa saat sinkronisasi berikutnya.
          </p>
        </div>

        {/* Form Messages */}
        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end pt-2 border-t border-white/5">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98]"
            >
              {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* Recent Sync Runs Table */}
      <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Riwayat Sinkronisasi Terkini
        </h3>

        {liveRecentRuns.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">Belum ada riwayat sinkronisasi.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 bg-white/[0.02] uppercase font-semibold text-[11px]">
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Transaksi</th>
                  <th className="py-3 px-3.5">Produk</th>
                  <th className="py-3 px-3.5">Status Harian</th>
                  <th className="py-3 px-3.5">Catatan / Kode Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {liveRecentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3.5 font-mono text-zinc-300 text-[11px] whitespace-nowrap">
                      {new Date(run.started_at).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          run.status === "success"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-zinc-300 whitespace-nowrap">{run.rows_transactions} baris</td>
                    <td className="py-3 px-3.5 font-mono text-zinc-300 whitespace-nowrap">{run.rows_products} baris</td>
                    <td className="py-3 px-3.5 font-mono text-zinc-300 whitespace-nowrap">{run.rows_daily_status} baris</td>
                    <td className="py-3 px-3.5 text-zinc-400 max-w-xs truncate">
                      {run.error_code ? (
                        <span className="text-rose-400 font-mono text-[11px]">
                          [{run.error_code}] {run.error_message}
                        </span>
                      ) : (
                        "—"
                      )}
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
