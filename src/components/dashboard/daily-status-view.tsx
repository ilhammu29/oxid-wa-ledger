"use client";

import { useState, useMemo } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  DoorClosed,
  ShoppingBag,
  Info,
} from "lucide-react";
import { setDailyStatusAction } from "@/app/dashboard/actions";

export interface DailyStatusRecord {
  local_date: string;
  status: "ACTIVE" | "NO_SALE" | "CLOSED";
  source: string;
  note?: string | null;
  created_at?: string;
}

interface DailyStatusViewProps {
  todayDate: string;
  todayStatus: DailyStatusRecord | null;
  history: DailyStatusRecord[];
  canManage: boolean;
  hasSalesToday: boolean;
}

export function DailyStatusView({
  todayDate,
  todayStatus,
  history,
  canManage,
  hasSalesToday,
}: DailyStatusViewProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSetStatus = async (status: "NO_SALE" | "CLOSED") => {
    setLoading(true);
    setError(null);

    const res = await setDailyStatusAction(status, note.trim() || undefined);
    setLoading(false);

    if (!res.success) {
      showNotification(res.error || "Gagal mengatur status harian.", true);
    } else {
      showNotification(
        `Status harian berhasil diatur: ${
          status === "NO_SALE" ? "TIDAK ADA PENJUALAN" : "TUTUP / LIBUR"
        }`
      );
      setNote("");
    }
  };

  const currentStatusType = todayStatus?.status || (hasSalesToday ? "ACTIVE" : "OPEN");

  // Summary counts
  const noSaleCount = useMemo(() => history.filter((h) => h.status === "NO_SALE").length, [history]);
  const closedCount = useMemo(() => history.filter((h) => h.status === "CLOSED").length, [history]);
  const activeCount = useMemo(() => history.filter((h) => h.status === "ACTIVE").length, [history]);

  const renderStatusBadge = (st: string) => {
    if (st === "NO_SALE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-hover text-muted border border-border">
          <ShoppingBag className="w-3 h-3 text-muted" />
          Tidak Ada Penjualan
        </span>
      );
    }
    if (st === "CLOSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <DoorClosed className="w-3 h-3 text-rose-500" />
          Toko Tutup / Libur
        </span>
      );
    }
    if (st === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Aktif
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-hover text-muted border border-border">
        <Clock className="w-3 h-3 text-muted" />
        Menunggu Transaksi
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          WhatsApp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        Dashboard
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Status Harian
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Pantau aktivitas operasional setiap hari.
          </p>
        </div>
      </div>

      {/* Inline Operational Stats Header */}
      <div className="rounded-xl bg-surface border border-border p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-muted block font-medium">Status Hari Ini ({todayDate})</span>
            <div className="mt-1">{renderStatusBadge(currentStatusType)}</div>
          </div>
          {todayStatus?.source && (
            <span className="text-xs text-muted font-mono">
              via {todayStatus.source}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4 font-mono">
          <div>
            <span className="font-semibold text-foreground">{activeCount}</span> hari aktif
          </div>
          <span className="text-border">·</span>
          <div>
            <span className="font-semibold text-foreground">{noSaleCount}</span> tanpa penjualan
          </div>
          <span className="text-border">·</span>
          <div>
            <span className="font-semibold text-foreground">{closedCount}</span> libur
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Perhatian</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Berhasil</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Today's Operational Control Card */}
      <div className="rounded-xl bg-surface border border-border p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Kontrol Status Operasional Hari Ini
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Gunakan untuk mencatat hari tanpa transaksi atau hari libur agar rekap ledger tetap akurat.
            </p>
          </div>
          <span className="text-xs font-mono text-muted bg-surface-hover px-2.5 py-1 rounded-md border border-border">
            {todayDate}
          </span>
        </div>

        {canManage ? (
          <div className="space-y-4 pt-1">
            {hasSalesToday ? (
              <div className="p-3.5 rounded-lg bg-surface-hover/60 border border-border text-xs flex items-start gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground">
                    Sudah Terdapat Penjualan Terkonfirmasi Hari Ini
                  </p>
                  <p className="text-muted mt-0.5 leading-relaxed">
                    Sesuai aturan konsistensi ledger, hari yang telah memiliki pencatatan transaksi terkonfirmasi tidak dapat ditandai sebagai NO_SALE atau CLOSED.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Catatan Status (Opsional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Libur Idul Fitri, Renovasi Toko, Cuaca Ekstrem"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleSetStatus("NO_SALE")}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-foreground border border-border font-medium text-xs disabled:opacity-50 transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-muted" />
                    <span>Konfirmasi Tidak Ada Penjualan</span>
                  </button>

                  <button
                    onClick={() => handleSetStatus("CLOSED")}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/20 font-medium text-xs disabled:opacity-50 transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <DoorClosed className="w-3.5 h-3.5 text-rose-500" />
                    <span>Konfirmasi Toko Libur / Tutup</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">
            Hanya Owner atau Admin yang memiliki wewenang untuk mengubah status operasional harian.
          </p>
        )}
      </div>

      {/* History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Riwayat Status Operasional Bulan Ini
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Daftar penandaan status operasional harian yang tercatat di sistem ledger.
            </p>
          </div>
          <span className="text-xs font-mono text-muted bg-surface-hover border border-border px-2 py-0.5 rounded-md">
            {history.length} Catatan
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-surface border border-border p-6 shadow-xs space-y-2">
            <CalendarCheck className="w-8 h-8 text-muted mx-auto opacity-60" />
            <h4 className="text-sm font-semibold text-foreground">
              Belum ada riwayat penandaan status khusus bulan ini
            </h4>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Penandaan hari libur atau tanpa penjualan akan otomatis diarsipkan di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-xl bg-surface border border-border shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-hover/50 text-muted/80 uppercase font-mono font-medium tracking-wider text-[11px]">
                    <th className="py-2.5 px-3.5">Tanggal</th>
                    <th className="py-2.5 px-3.5">Status Operasional</th>
                    <th className="py-2.5 px-3.5">Sumber</th>
                    <th className="py-2.5 px-3.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {history.map((row) => (
                    <tr key={row.local_date} className="hover:bg-surface-hover/60 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono tabular-nums font-medium text-foreground whitespace-nowrap">
                        {row.local_date}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {sourceBadge(row.source)}
                      </td>
                      <td className="py-2.5 px-3.5 text-muted">
                        {row.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden space-y-2">
              {history.map((row) => (
                <div
                  key={row.local_date}
                  className="rounded-xl bg-surface border border-border p-3.5 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono tabular-nums font-semibold text-foreground text-xs">
                      {row.local_date}
                    </span>
                    {sourceBadge(row.source)}
                  </div>
                  <div>{renderStatusBadge(row.status)}</div>
                  {row.note && (
                    <div className="text-xs text-muted bg-surface-hover border border-border p-2 rounded-md">
                      {row.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
