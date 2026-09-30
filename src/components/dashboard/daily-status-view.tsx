"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  DoorClosed,
  ShoppingBag,
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

  const renderStatusBadge = (st: string) => {
    if (st === "NO_SALE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
          TIDAK ADA PENJUALAN
        </span>
      );
    }
    if (st === "CLOSED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300">
          <DoorClosed className="w-3.5 h-3.5 text-red-700" />
          TOKO TUTUP / LIBUR
        </span>
      );
    }
    if (st === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          AKTIF (ADA PENJUALAN)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 border border-zinc-300">
        <Clock className="w-3.5 h-3.5 text-zinc-500" />
        BUKA / BELUM DITENTUKAN
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") return "Telegram";
    if (s === "whatsapp") return "WhatsApp";
    if (s === "dashboard") return "Dashboard";
    return "Owner";
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Perhatian</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900">Berhasil</p>
            <p className="mt-0.5">{success}</p>
          </div>
        </div>
      )}

      {/* Today's Status Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-mono">
              Status Operasional Hari Ini ({todayDate})
            </p>
            <div className="mt-2">{renderStatusBadge(currentStatusType)}</div>
          </div>
          {todayStatus?.source && (
            <p className="text-xs text-zinc-500">
              Ditetapkan via: <span className="font-mono font-medium text-zinc-800">{sourceBadge(todayStatus.source)}</span>
            </p>
          )}
        </div>

        {/* Change status actions (Owner/Admin only) */}
        {canManage && (
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Perbarui Status Hari Ini
            </p>

            {hasSalesToday ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
                <p className="font-medium text-zinc-800">
                  Sudah Terdapat Penjualan Terkonfirmasi Hari Ini
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Sesuai aturan konsistensi ledger, hari yang telah memiliki penjualan terkonfirmasi tidak dapat ditandai sebagai NO_SALE atau CLOSED.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Catatan tambahan (opsional, misal: Libur Idul Fitri)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleSetStatus("NO_SALE")}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Tandai Tidak Ada Penjualan (NO_SALE)
                  </button>

                  <button
                    onClick={() => handleSetStatus("CLOSED")}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-xs disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <DoorClosed className="w-3.5 h-3.5" />
                    Tandai Toko Tutup / Libur (CLOSED)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Table */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 tracking-tight">
            Riwayat Status Operasional Bulan Ini
          </h3>
          <p className="text-xs text-zinc-500">
            Daftar penandaan status operasional harian yang tercatat di sistem.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 bg-white rounded-xl border border-zinc-200">
            <CalendarCheck className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-600">
              Belum ada riwayat penandaan status khusus bulan ini
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase font-semibold tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Status Operasional</th>
                  <th className="py-3 px-4">Sumber / Channel</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {history.map((row) => (
                  <tr key={row.local_date} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-zinc-800 whitespace-nowrap">
                      {row.local_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderStatusBadge(row.status)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-600 whitespace-nowrap">
                      {sourceBadge(row.source)}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {row.note || "-"}
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
