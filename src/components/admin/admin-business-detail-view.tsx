"use client";

import { useState } from "react";
import { AdminBusinessDetail } from "@/modules/subscriptions/admin";
import { SubscriptionPlan } from "@/modules/subscriptions/types";
import { formatIDR } from "@/modules/subscriptions/plans";
import {
  adminActivateSubscriptionAction,
  adminConfirmPaymentAction,
  adminRejectPaymentAction,
  adminExtendSubscriptionAction,
  adminSuspendSubscriptionAction,
  adminReactivateSubscriptionAction,
  adminCancelSubscriptionAction,
  AdminActionResult,
} from "@/app/admin/actions";
import {
  CheckCircle2,
  AlertTriangle,
  Activity,
  FileSpreadsheet,
} from "lucide-react";

interface AdminBusinessDetailViewProps {
  detail: AdminBusinessDetail;
  plans: SubscriptionPlan[];
}

export function AdminBusinessDetailView({ detail, plans }: AdminBusinessDetailViewProps) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const { business, subscriptionState, payments, channels, googleSheets, auditLogs } = detail;
  const { plan, status, remainingDays, currentPeriodEnd } = subscriptionState;

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  const handleAction = async (actionFn: (fd: FormData) => Promise<AdminActionResult>, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    fd.append("businessId", business.id);
    if (selectedPaymentId) {
      fd.append("paymentId", selectedPaymentId);
    }

    const res = await actionFn(fd);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: "Aksi berhasil dieksekusi dan dicatat ke audit log." });
      setActiveModal(null);
      setSelectedPaymentId(null);
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mengeksekusi aksi admin." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Subscription Card & Admin Actions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-lg font-bold text-zinc-100">{plan.name}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-800 text-zinc-200 border border-zinc-700">
                {status}
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sisa masa aktif: <strong className="text-zinc-200">{remainingDays} hari</strong> • Berlaku hingga:{" "}
              <strong className="text-zinc-200">{formatDate(currentPeriodEnd)}</strong>
            </p>
          </div>

          {/* Action triggers */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveModal("activate")}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors"
            >
              Aktivasi Paket
            </button>
            <button
              onClick={() => setActiveModal("extend")}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors border border-zinc-700"
            >
              Perpanjang (+Hari)
            </button>
            {status !== "suspended" && (
              <button
                onClick={() => setActiveModal("suspend")}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
              >
                Tangguhkan
              </button>
            )}
            {status === "suspended" && (
              <button
                onClick={() => setActiveModal("reactivate")}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-colors"
              >
                Aktifkan Kembali
              </button>
            )}
            {status !== "cancelled" && (
              <button
                onClick={() => setActiveModal("cancel")}
                className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-6 text-xs">
          <div>
            <span className="text-zinc-500 block mb-1">ID Bisnis</span>
            <span className="font-mono text-zinc-300 font-semibold">{business.id}</span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-1">Zona Waktu / Mata Uang</span>
            <span className="text-zinc-300">{business.timezone} • {business.currency}</span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-1">Tanggal Terdaftar</span>
            <span className="text-zinc-300">{formatDate(business.createdAt)}</span>
          </div>
          <div>
            <span className="text-zinc-500 block mb-1">Hak Mutasi Finansial</span>
            <span className={subscriptionState.canCreateMutations ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {subscriptionState.canCreateMutations ? "Diizinkan (Aktif)" : "Dibatasi"}
            </span>
          </div>
        </div>
      </div>

      {/* Integration & Channel Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Kanal Komunikasi</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Telegram Bot</span>
              <span className={channels.telegramEnabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                {channels.telegramEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">WhatsApp Cloud</span>
              <span className={channels.whatsappEnabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                {channels.whatsappEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Kanal Utama</span>
              <span className="font-mono text-zinc-300 capitalize">{channels.primaryChannel}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Kanal Pengingat</span>
              <span className="font-mono text-zinc-300 capitalize">{channels.reminderChannel}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Google Sheets One-Way Sync</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Status Sinkronisasi</span>
              <span className={googleSheets?.enabled ? "text-emerald-400 font-semibold" : "text-zinc-500"}>
                {googleSheets?.enabled ? "Aktif" : "Belum Terhubung"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-800/60">
              <span className="text-zinc-400">Spreadsheet ID</span>
              <span className="font-mono text-[11px] text-zinc-400 truncate max-w-[200px]">
                {googleSheets?.spreadsheetId || "-"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Terakhir Disinkronkan</span>
              <span className="text-zinc-300">{formatDate(googleSheets?.lastSyncedAt || null)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Records Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">Pembayaran Klien ({payments.length})</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Daftar transfer manual yang diajukan oleh pemilik bisnis.</p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Belum ada bukti pembayaran dari klien ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Referensi Transfer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-400">{formatDate(p.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-100">{formatIDR(p.amountIdr)}</td>
                    <td className="py-3 px-4 capitalize">{p.paymentMethod.replace("_", " ")}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">{p.reference || "-"}</td>
                    <td className="py-3 px-4">
                      {p.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Menunggu
                        </span>
                      )}
                      {p.status === "confirmed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Dikonfirmasi
                        </span>
                      )}
                      {p.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Ditolak
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPaymentId(p.id);
                              setActiveModal("confirmPayment");
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Konfirmasi
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPaymentId(p.id);
                              setActiveModal("rejectPayment");
                            }}
                            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[11px] font-semibold transition-colors"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                      {p.status !== "pending" && (
                        <span className="text-[11px] text-zinc-500">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Audit Trail */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">Audit Trail Langganan</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Catatan riwayat perubahan status langganan oleh admin atau sistem.</p>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">Belum ada catatan audit.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-200">{log.action}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {log.new_status}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">{log.notes || "-"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-zinc-500 block text-[11px]">{formatDate(log.created_at)}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">{log.actor_email || "System Job"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Modal Activate */}
      {activeModal === "activate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Aktivasi Paket Langganan</h3>
            <p className="text-xs text-zinc-400 mb-4">Pilih paket dan durasi hari aktif untuk bisnis ini.</p>
            <form onSubmit={(e) => handleAction(adminActivateSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Pilihan Paket</label>
                <select
                  name="planCode"
                  defaultValue="basic"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({formatIDR(p.priceIdr)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Durasi Hari Aktif</label>
                <input
                  type="number"
                  name="durationDays"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Catatan Audit</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Aktivasi perdana klien pilot"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Aktifkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Confirm Payment */}
      {activeModal === "confirmPayment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Konfirmasi pembayaran ini akan memperpanjang masa aktif langganan bisnis.
            </p>
            <form onSubmit={(e) => handleAction(adminConfirmPaymentAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Perpanjangan Hari (+)</label>
                <input
                  type="number"
                  name="extensionDays"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Catatan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Bukti transfer BCA valid"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Reject Payment */}
      {activeModal === "rejectPayment" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Tolak Bukti Pembayaran</h3>
            <p className="text-xs text-zinc-400 mb-4">Tolak pengajuan pembayaran jika bukti tidak valid.</p>
            <form onSubmit={(e) => handleAction(adminRejectPaymentAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Alasan Penolakan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Mutasi rekening tidak ditemukan"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Tolak Bukti"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Extend */}
      {activeModal === "extend" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Perpanjang Masa Aktif</h3>
            <p className="text-xs text-zinc-400 mb-4">Tambahkan durasi hari ekstra ke masa berlaku saat ini.</p>
            <form onSubmit={(e) => handleAction(adminExtendSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Jumlah Hari Tambahan</label>
                <input
                  type="number"
                  name="days"
                  defaultValue={7}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Catatan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Kompensasi kendala teknis / masa promosi"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Tambahkan Hari"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Suspend */}
      {activeModal === "suspend" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400 mb-1">Tangguhkan Langganan Bisnis</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Penangguhan akan membatasi pencatatan penjualan via bot dan dashboard. Riwayat data tetap aman tersimpan.
            </p>
            <form onSubmit={(e) => handleAction(adminSuspendSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Alasan Penangguhan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Masa tenggang terlewati tanpa pembayaran"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Ya, Tangguhkan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Reactivate */}
      {activeModal === "reactivate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-blue-400 mb-1">Aktifkan Kembali Langganan</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Mengaktifkan kembali akun yang ditangguhkan dan membuka kembali hak pencatatan transaksi.
            </p>
            <form onSubmit={(e) => handleAction(adminReactivateSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Durasi Hari Aktif</label>
                <input
                  type="number"
                  name="days"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Catatan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Reaktivasi atas persetujuan pimpinan"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-zinc-950 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Aktifkan Kembali"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Cancel */}
      {activeModal === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-200 mb-1">Batalkan Langganan</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Status langganan akan diubah menjadi batal. Seluruh riwayat transaksi di ledger tetap dipertahankan.
            </p>
            <form onSubmit={(e) => handleAction(adminCancelSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Alasan Pembatalan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Permintaan penutupan akun oleh pemilik"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Batalkan Langganan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
