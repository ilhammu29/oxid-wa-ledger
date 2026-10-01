"use client";

import { useState, useMemo } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  DoorClosed,
  ShoppingBag,
  Calendar,
  Sparkles,
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
        `Status harian berhasil diatur menjadi ${
          status === "NO_SALE" ? "TIDAK ADA PENJUALAN" : "TUTUP/LIBUR"
        }!`
      );
      setNote("");
    }
  };

  const currentStatusType = todayStatus?.status || (hasSalesToday ? "ACTIVE" : "OPEN");

  // Metric counts
  const noSaleCount = useMemo(() => history.filter((h) => h.status === "NO_SALE").length, [history]);
  const closedCount = useMemo(() => history.filter((h) => h.status === "CLOSED").length, [history]);
  const activeCount = useMemo(() => history.filter((h) => h.status === "ACTIVE").length, [history]);

  const renderStatusBadge = (st: string) => {
    if (st === "NO_SALE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
          TIDAK ADA PENJUALAN
        </span>
      );
    }
    if (st === "CLOSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <DoorClosed className="w-3.5 h-3.5 text-rose-400" />
          TOKO TUTUP / LIBUR
        </span>
      );
    }
    if (st === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          AKTIF (ADA TRANSAKSI)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-zinc-300 border border-white/20">
        <Clock className="w-3.5 h-3.5 text-zinc-400" />
        BUKA / NORMAL
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          WhatsApp
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
        Dashboard Owner
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top 4 Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Status Hari Ini */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Hari Ini ({todayDate})
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            {renderStatusBadge(currentStatusType)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {todayStatus?.source ? `Ditetapkan via ${todayStatus.source}` : "Status default otomatis"}
          </div>
        </div>

        {/* Metric 2: Hari Aktif */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Hari Ada Transaksi
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {activeCount}
            </span>
            <span className="text-xs text-zinc-400">Hari</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/90 font-medium">
            Tercatat di ledger
          </div>
        </div>

        {/* Metric 3: Tidak Ada Penjualan */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Tidak Ada Penjualan
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {noSaleCount}
            </span>
            <span className="text-xs text-zinc-400">Hari (NO_SALE)</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400/90 font-medium">
            Buka tanpa omzet
          </div>
        </div>

        {/* Metric 4: Toko Libur */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Toko Libur
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <DoorClosed className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {closedCount}
            </span>
            <span className="text-xs text-zinc-400">Hari (CLOSED)</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400/90 font-medium">
            Operasional ditutup
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Perhatian</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-200">Berhasil</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Today's Status Action Card */}
      <div className="rounded-2xl border border-white/10 bg-[#111726]/80 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Kontrol Status Operasional Hari Ini
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Tanggal operasional aktif: <span className="font-mono text-purple-300 font-semibold">{todayDate}</span>
            </p>
          </div>
          <div>{renderStatusBadge(currentStatusType)}</div>
        </div>

        {/* Change status actions (Owner/Admin only) */}
        {canManage && (
          <div className="space-y-4 pt-1">
            {hasSalesToday ? (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">
                    Sudah Terdapat Penjualan Terkonfirmasi Hari Ini
                  </p>
                  <p className="text-zinc-400 mt-0.5 leading-relaxed">
                    Sesuai aturan konsistensi ledger, hari yang telah memiliki pencatatan transaksi terkonfirmasi tidak dapat ditandai sebagai NO_SALE atau CLOSED.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                    Catatan Status (Opsional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contoh: Libur Idul Fitri, Renovasi Kolam, Hujan Lebat"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-white/10 bg-white/5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleSetStatus("NO_SALE")}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold text-xs shadow-md disabled:opacity-50 transition inline-flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Tandai Tidak Ada Penjualan (NO_SALE)</span>
                  </button>

                  <button
                    onClick={() => handleSetStatus("CLOSED")}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs shadow-md disabled:opacity-50 transition inline-flex items-center gap-2"
                  >
                    <DoorClosed className="w-4 h-4 text-rose-400" />
                    <span>Tandai Toko Tutup / Libur (CLOSED)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Riwayat Status Operasional Bulan Ini
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Daftar penandaan status operasional harian yang tercatat di sistem ledger.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
            {history.length} Catatan
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-white/10 bg-[#111726]/80 p-6 backdrop-blur-md">
            <CalendarCheck className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-white">
              Belum ada riwayat penandaan status khusus bulan ini
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Penandaan hari libur atau tanpa penjualan akan otomatis diarsipkan di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md shadow-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-zinc-400 uppercase font-semibold tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4">Status Operasional</th>
                    <th className="py-3.5 px-4">Sumber / Channel</th>
                    <th className="py-3.5 px-4">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history.map((row) => (
                    <tr key={row.local_date} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-white whitespace-nowrap">
                        {row.local_date}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderStatusBadge(row.status)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {sourceBadge(row.source)}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-300">
                        {row.note || <span className="text-zinc-600">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden space-y-3">
              {history.map((row) => (
                <div
                  key={row.local_date}
                  className="rounded-2xl border border-white/10 bg-[#111726]/90 p-4 space-y-2.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-white text-xs">
                      {row.local_date}
                    </span>
                    {sourceBadge(row.source)}
                  </div>
                  <div>{renderStatusBadge(row.status)}</div>
                  {row.note && (
                    <div className="text-xs text-zinc-400 bg-white/5 border border-white/5 p-2 rounded-lg">
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
