"use client";

import { useState, useTransition } from "react";
import {
  testGoogleSheetsConnectionAction,
  saveGoogleSheetsConnectionAction,
  triggerManualSyncAction,
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

export function GoogleSheetsView({
  connection,
  pendingJob,
  recentRuns,
  isServerConfigured,
  serviceAccountEmail,
  role,
}: GoogleSheetsViewProps) {
  const [spreadsheetInput, setSpreadsheetInput] = useState(
    connection?.spreadsheet_id
      ? `https://docs.google.com/spreadsheets/d/${connection.spreadsheet_id}/edit`
      : ""
  );
  const [enabled, setEnabled] = useState(connection?.enabled ?? false);
  const [syncInterval, setSyncInterval] = useState(
    String(connection?.sync_interval_minutes || 5)
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

  // Derive connection state badge
  let statusBadge: {
    label: string;
    bg: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
  } = {
    label: "NOT CONFIGURED",
    bg: "bg-zinc-100 border-zinc-200",
    text: "text-zinc-600",
    icon: Info,
  };

  if (!isServerConfigured) {
    statusBadge = {
      label: "SERVER UNCONFIGURED",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      icon: AlertTriangle,
    };
  } else if (pendingJob || connection?.last_sync_status === "syncing") {
    statusBadge = {
      label: "SYNCING",
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      icon: RefreshCw,
    };
  } else if (!connection?.spreadsheet_id) {
    statusBadge = {
      label: "NOT CONFIGURED",
      bg: "bg-zinc-100 border-zinc-200",
      text: "text-zinc-600",
      icon: Info,
    };
  } else if (!connection.enabled) {
    statusBadge = {
      label: "DISABLED",
      bg: "bg-zinc-100 border-zinc-200",
      text: "text-zinc-600",
      icon: XCircle,
    };
  } else if (connection.last_sync_status === "failed") {
    statusBadge = {
      label: "ERROR",
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      icon: XCircle,
    };
  } else if (connection.last_sync_status === "success") {
    statusBadge = {
      label: "CONNECTED",
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
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
    try {
      const res = await triggerManualSyncAction();
      if (res.success) {
        setMessage({
          text: "Sinkronisasi dijadwalkan. Worker akan segera memperbarui Google Sheets.",
          type: "success",
        });
      } else {
        setMessage({
          text: res.error || "Gagal menjadwalkan sinkronisasi.",
          type: "error",
        });
      }
    } finally {
      setIsManualSyncing(false);
    }
  };

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6">
      {/* Server Configuration Alert */}
      {!isServerConfigured && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Google Sheets belum dikonfigurasi pada server.</p>
            <p>
              Environment variable <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> dan <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> belum tersedia pada runtime server. Aplikasi tetap berfungsi normal, namun sinkronisasi Google Sheets ditangguhkan.
            </p>
          </div>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900">
                {connection?.spreadsheet_title || "Google Spreadsheet Mirror"}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.bg} ${statusBadge.text}`}
              >
                <StatusIcon className={`w-3 h-3 ${statusBadge.label === "SYNCING" ? "animate-spin" : ""}`} />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {connection?.last_sync_at
                ? `Terakhir disinkronkan: ${new Date(connection.last_sync_at).toLocaleString("id-ID")}`
                : "Belum pernah disinkronkan"}
            </p>
          </div>
        </div>

        {/* Action: Manual Sync Button */}
        <button
          type="button"
          onClick={handleManualSync}
          disabled={!connection?.enabled || !connection?.spreadsheet_id || isManualSyncing || isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? "animate-spin" : ""}`} />
          {isManualSyncing ? "Menjadwalkan..." : "Sync Now (Sinkronkan Sekarang)"}
        </button>
      </div>

      {/* Operator Setup Guide Box */}
      <div className="p-5 bg-zinc-900 text-zinc-100 rounded-2xl space-y-3.5 border border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          Panduan Pengaturan Klien (3 Langkah Mudah)
        </div>
        <ol className="text-xs text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
          <li>
            Buat spreadsheet baru di Google Drive Anda (misal: <em>Buku Kas OXID</em>).
          </li>
          <li>
            Buka spreadsheet, klik tombol <strong>Bagikan (Share)</strong>, lalu tambahkan email Service Account berikut sebagai <strong>Editor</strong>:
            <div className="mt-1.5 flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg font-mono text-[11px] text-emerald-300">
              <span className="truncate">{serviceAccountEmail || "Belum dikonfigurasi"}</span>
              {serviceAccountEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition"
                >
                  <Copy className="w-3 h-3" />
                  {copiedEmail ? "Tersalin!" : "Salin"}
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
      <form onSubmit={handleSave} className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            Konfigurasi Spreadsheet
          </h3>

          {/* Spreadsheet URL / ID Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Tautan Google Spreadsheet atau Spreadsheet ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={spreadsheetInput}
                onChange={(e) => setSpreadsheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                disabled={!canEdit || isPending}
                className="flex-1 px-3.5 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:bg-zinc-100"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!canEdit || isTesting || !spreadsheetInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {isTesting ? "Memeriksa..." : "Test Connection"}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              Hanya domain resmi <code className="text-zinc-600">docs.google.com</code> yang diterima demi keamanan.
            </p>

            {/* Test Connection Result Box */}
            {testResult?.tested && (
              <div
                className={`mt-2 p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
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
          <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
            <div>
              <p className="text-xs font-semibold text-zinc-800">Sinkronisasi Otomatis</p>
              <p className="text-[11px] text-zinc-500">
                Otomatis memperbarui spreadsheet setiap ada transaksi atau perubahan status bisnis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => canEdit && setEnabled(!enabled)}
              disabled={!canEdit || isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? "bg-emerald-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Sync Interval Selector */}
          <div className="pt-2 space-y-1.5 border-t border-zinc-100">
            <label className="block text-xs font-semibold text-zinc-700">
              Interval Rekonsiliasi Otomatis (Periodic Reconciliation)
            </label>
            <select
              value={syncInterval}
              onChange={(e) => setSyncInterval(e.target.value)}
              disabled={!canEdit || isPending}
              className="px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="5">Setiap 5 Menit (Direkomendasikan)</option>
              <option value="15">Setiap 15 Menit</option>
              <option value="30">Setiap 30 Menit</option>
              <option value="60">Setiap 60 Menit (1 Jam)</option>
            </select>
            <p className="text-[11px] text-zinc-400">
              Memastikan lembar laporan tetap selaras jika ada event sinkronisasi yang tertunda.
            </p>
          </div>
        </div>

        {/* Managed Worksheets Notice */}
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
            <Info className="w-4 h-4 text-emerald-600" />
            Lembar Kerja yang Dikelola OXID (Managed Worksheets)
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed">
            OXID hanya mengelola 5 lembar kerja: <code className="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800 font-mono">Dashboard</code>, <code className="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800 font-mono">Transactions</code>, <code className="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800 font-mono">Products</code>, <code className="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800 font-mono">Daily_Status</code>, dan <code className="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-800 font-mono">Config</code>. Lembar buatan Anda sendiri (misal: <em>Catatan Pribadi</em>) tidak akan disentuh atau dihapus.
          </p>
        </div>

        {/* Disclaimer / Single Source of Truth Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Pemberitahuan Penting:</strong> Supabase tetap menjadi satu-satunya sumber utama (*single source of truth*) data keuangan. Perubahan manual yang Anda buat langsung di Google Sheets <strong>tidak akan mengubah</strong> data di OXID Ledger dan dapat ditimpa saat sinkronisasi berikutnya.
          </p>
        </div>

        {/* Form Messages */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        {canEdit && (
          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* Recent Sync Runs Table */}
      <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Riwayat Sinkronisasi Terkini
        </h3>

        {recentRuns.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">Belum ada riwayat sinkronisasi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="pb-2 font-medium">Waktu</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Transaksi</th>
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 font-medium">Status Harian</th>
                  <th className="pb-2 font-medium">Catatan / Kode Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="text-zinc-700">
                    <td className="py-2.5 font-mono text-[11px]">
                      {new Date(run.started_at).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          run.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {run.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono">{run.rows_transactions} baris</td>
                    <td className="py-2.5 font-mono">{run.rows_products} baris</td>
                    <td className="py-2.5 font-mono">{run.rows_daily_status} baris</td>
                    <td className="py-2.5 text-zinc-500 max-w-xs truncate">
                      {run.error_code ? (
                        <span className="text-red-600 font-mono text-[11px]">
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
