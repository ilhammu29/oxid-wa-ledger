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
  Info,
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
    label: "Belum Dihubungkan",
    bg: "bg-secondary border-border",
    text: "text-muted-foreground",
    icon: Info,
  };

  if (!isServerConfigured) {
    statusBadge = {
      label: "Server Belum Siap",
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-700 dark:text-amber-300",
      icon: AlertTriangle,
    };
  } else if (isSyncingActive) {
    statusBadge = {
      label: "Menyinkronkan...",
      bg: "bg-sky-500/10 border-sky-500/20",
      text: "text-sky-700 dark:text-sky-300",
      icon: RefreshCw,
    };
  } else if (!liveConnection?.spreadsheet_id) {
    statusBadge = {
      label: "Belum Terhubung",
      bg: "bg-secondary border-border",
      text: "text-muted-foreground",
      icon: Info,
    };
  } else if (!liveConnection.enabled) {
    statusBadge = {
      label: "Nonaktif",
      bg: "bg-secondary border-border",
      text: "text-muted-foreground",
      icon: XCircle,
    };
  } else if (liveConnection.last_sync_status === "failed") {
    statusBadge = {
      label: "Gangguan",
      bg: "bg-rose-500/10 border-rose-500/20",
      text: "text-rose-700 dark:text-rose-300",
      icon: XCircle,
    };
  } else if (liveConnection.last_sync_status === "success") {
    statusBadge = {
      label: "Terhubung & Sinkron",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-700 dark:text-emerald-300",
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Google Sheets Mirror
        </h1>
        <p className="text-xs text-muted mt-1">
          Pencadangan satu arah otomatis dari buku besar OXID ke Google Spreadsheet bisnis Anda.
        </p>
      </div>

      {/* Server Configuration Alert */}
      {!isServerConfigured && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">Google Sheets belum dikonfigurasi pada server.</p>
            <p className="text-muted leading-relaxed">
              Kredensial Service Account belum tersedia pada runtime server. Sinkronisasi Google Sheets ditangguhkan sementara.
            </p>
          </div>
        </div>
      )}

      {/* Status & Quick Action Card */}
      <div className="card-base bg-surface border-border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground">
                {liveConnection?.spreadsheet_title || "Belum Terhubung ke Spreadsheet"}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.bg} ${statusBadge.text}`}
              >
                <StatusIcon className={`w-3 h-3 ${statusBadge.label === "Menyinkronkan..." ? "animate-spin" : ""}`} />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {liveConnection?.last_sync_at
                ? `Terakhir sinkron: ${new Date(liveConnection.last_sync_at).toLocaleString("id-ID")}`
                : "Belum pernah disinkronkan"}
            </p>
            {liveRecentRuns.length > 0 && liveRecentRuns[0].status === "success" && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                ✓ {liveRecentRuns[0].rows_transactions} transaksi, {liveRecentRuns[0].rows_products} produk, {liveRecentRuns[0].rows_daily_status} status harian
              </p>
            )}
          </div>
        </div>

        {/* Action: Manual Sync Button */}
        <button
          type="button"
          onClick={handleManualSync}
          disabled={!liveConnection?.enabled || !liveConnection?.spreadsheet_id || isSyncingActive || isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground text-xs font-medium transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingActive ? "animate-spin" : ""}`} />
          <span>{isSyncingActive ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
        </button>
      </div>

      {/* Error Callout Alert Banner */}
      {liveConnection?.last_sync_status === "failed" && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2.5">
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
            <p className="font-semibold text-foreground">Kendala Sinkronisasi Terakhir</p>
            <p>{getFriendlyErrorMessage(liveConnection.last_error_code, liveConnection.last_error_message)}</p>
            {liveConnection.last_error_code === "PERMISSION_DENIED" && serviceAccountEmail && (
              <p className="text-[11px] text-muted mt-1">
                Solusi: Buka spreadsheet Anda, klik tombol <strong>Bagikan (Share)</strong>, lalu tambahkan <code className="bg-secondary px-1 py-0.5 rounded font-mono text-foreground">{serviceAccountEmail}</code> sebagai <strong>Editor</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Setup Guide Box */}
      <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Panduan Pengaturan (3 Langkah)
        </h3>
        <ol className="text-xs text-muted space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Buat spreadsheet baru di Google Drive Anda (misal: <em>Buku Kas OXID Ledger</em>).
          </li>
          <li>
            Klik tombol <strong>Bagikan (Share)</strong> di spreadsheet, lalu undang email Service Account berikut sebagai <strong>Editor</strong>:
            <div className="mt-1.5 flex items-center gap-2 bg-secondary p-2 rounded-lg font-mono text-xs text-foreground">
              <span className="truncate">{serviceAccountEmail || "Belum dikonfigurasi"}</span>
              {serviceAccountEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition px-2 py-0.5 rounded bg-surface border border-border"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedEmail ? "Tersalin!" : "Salin"}</span>
                </button>
              )}
            </div>
          </li>
          <li>
            Salin tautan spreadsheet dari browser, tempelkan pada kolom di bawah, klik <strong>Test Connection</strong>, lalu simpan.
          </li>
        </ol>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="card-base bg-surface border-border p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Konfigurasi Spreadsheet
        </h3>

        {/* Spreadsheet URL / ID Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-foreground">
            Tautan Google Spreadsheet atau ID
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={spreadsheetInput}
              onChange={(e) => setSpreadsheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
              disabled={!canEdit || isPending}
              className="flex-1 px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary font-mono disabled:opacity-50 transition"
            />
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!canEdit || isTesting || !spreadsheetInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-secondary hover:bg-surface-hover border border-border disabled:opacity-50 text-foreground rounded-lg transition shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{isTesting ? "Memeriksa..." : "Test Connection"}</span>
            </button>
          </div>
          <p className="text-[11px] text-muted">
            Hanya domain resmi <code className="font-mono text-foreground">docs.google.com</code> yang diterima demi keamanan.
          </p>

          {/* Test Connection Result Box */}
          {testResult?.tested && (
            <div
              className={`mt-2 p-3 rounded-lg border text-xs flex items-start gap-2 ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
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
        <div className="pt-3 flex items-center justify-between border-t border-border">
          <div>
            <p className="text-xs font-medium text-foreground">Sinkronisasi Otomatis</p>
            <p className="text-[11px] text-muted">
              Perbarui lembar kerja secara berkala saat ada transaksi baru tercatat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => canEdit && setEnabled(!enabled)}
            disabled={!canEdit || isPending}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
              enabled ? "bg-primary" : "bg-secondary border border-border"
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Sync Interval Selector */}
        <div className="pt-3 space-y-1.5 border-t border-border">
          <label className="block text-xs font-medium text-foreground">
            Interval Rekonsiliasi Otomatis
          </label>
          <select
            value={syncInterval}
            onChange={(e) => setSyncInterval(e.target.value)}
            disabled={!canEdit || isPending}
            className="px-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition"
          >
            <option value="5">Setiap 5 Menit (Direkomendasikan)</option>
            <option value="15">Setiap 15 Menit</option>
            <option value="30">Setiap 30 Menit</option>
            <option value="60">Setiap 60 Menit (1 Jam)</option>
          </select>
        </div>

        {/* Single Source of Truth Notice */}
        <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            OXID hanya mengelola 5 tab: <code className="font-mono text-foreground">Dashboard</code>, <code className="font-mono text-foreground">Transactions</code>, <code className="font-mono text-foreground">Products</code>, <code className="font-mono text-foreground">Daily_Status</code>, dan <code className="font-mono text-foreground">Config</code>. Tab buatan Anda tidak akan dihapus. Perubahan langsung di Google Sheets tidak mengubah data di ledger OXID.
          </p>
        </div>

        {/* Form Messages */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit */}
        {canEdit && (
          <div className="flex justify-end pt-1 border-t border-border">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-medium transition"
            >
              {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* Recent Sync Runs Table */}
      <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Riwayat Sinkronisasi Terkini
        </h3>

        {liveRecentRuns.length === 0 ? (
          <p className="text-xs text-muted py-2">Belum ada riwayat sinkronisasi.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted bg-secondary/50 uppercase font-medium text-[11px]">
                  <th className="py-2 px-3">Waktu</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Transaksi</th>
                  <th className="py-2 px-3">Produk</th>
                  <th className="py-2 px-3">Status Harian</th>
                  <th className="py-2 px-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {liveRecentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-mono text-muted text-[11px] whitespace-nowrap">
                      {new Date(run.started_at).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          run.status === "success"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                        }`}
                      >
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-foreground whitespace-nowrap">{run.rows_transactions} baris</td>
                    <td className="py-2.5 px-3 font-mono text-foreground whitespace-nowrap">{run.rows_products} baris</td>
                    <td className="py-2.5 px-3 font-mono text-foreground whitespace-nowrap">{run.rows_daily_status} baris</td>
                    <td className="py-2.5 px-3 text-muted max-w-xs truncate">
                      {run.error_code ? (
                        <span className="text-rose-600 dark:text-rose-400 font-mono text-[11px]">
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
