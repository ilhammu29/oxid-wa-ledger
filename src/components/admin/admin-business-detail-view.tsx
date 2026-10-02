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
  X,
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

  const handleAction = async (
    actionFn: (fd: FormData) => Promise<AdminActionResult>,
    e: React.FormEvent<HTMLFormElement>
  ) => {
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

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "trialing":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "grace_period":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. FEEDBACK BANNER
      ────────────────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-muted/30 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. SUBSCRIPTION CARD & ADMIN ACTION BAR
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xl font-bold text-foreground">{plan.name}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusBadge(
                  status
                )}`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sisa masa aktif: <strong className="text-foreground">{remainingDays} hari</strong> · Berlaku hingga:{" "}
              <strong className="text-foreground">{formatDate(currentPeriodEnd)}</strong>
            </p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveModal("activate")}
              className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors shadow-2xs"
            >
              Aktivasi Paket
            </button>
            <button
              onClick={() => setActiveModal("extend")}
              className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors border border-border"
            >
              Perpanjang (+Hari)
            </button>
            {status !== "suspended" && (
              <button
                onClick={() => setActiveModal("suspend")}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-semibold transition-colors"
              >
                Tangguhkan
              </button>
            )}
            {status === "suspended" && (
              <button
                onClick={() => setActiveModal("reactivate")}
                className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/20 text-xs font-semibold transition-colors"
              >
                Aktifkan Kembali
              </button>
            )}
            {status !== "cancelled" && (
              <button
                onClick={() => setActiveModal("cancel")}
                className="px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
              >
                Batalkan
              </button>
            )}
          </div>
        </div>

        {/* Info Key-Value Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block mb-0.5 text-[11px]">ID Bisnis</span>
            <span className="font-mono text-foreground font-semibold break-all">{business.id}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5 text-[11px]">Zona Waktu / Kurs</span>
            <span className="text-foreground font-medium">{business.timezone} · {business.currency}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5 text-[11px]">Tanggal Terdaftar</span>
            <span className="text-foreground font-medium">{formatDate(business.createdAt)}</span>
          </div>
          <div>
            <span className="text-muted-foreground block mb-0.5 text-[11px]">Hak Mutasi Finansial</span>
            <span className={subscriptionState.canCreateMutations ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
              {subscriptionState.canCreateMutations ? "Diizinkan (Aktif)" : "Dibatasi"}
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. INTEGRATION & CHANNELS
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Communication Channels */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Kanal Komunikasi
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Telegram Bot</span>
              <span className={channels.telegramEnabled ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                {channels.telegramEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">WhatsApp Cloud API</span>
              <span className={channels.whatsappEnabled ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                {channels.whatsappEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Kanal Pencatatan Utama</span>
              <span className="font-mono text-foreground capitalize">{channels.primaryChannel}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Kanal Pengingat Ringkasan</span>
              <span className="font-mono text-foreground capitalize">{channels.reminderChannel}</span>
            </div>
          </div>
        </div>

        {/* Google Sheets Sync */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Google Sheets Sync
            </h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Status Sinkronisasi</span>
              <span className={googleSheets?.enabled ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                {googleSheets?.enabled ? "Aktif" : "Belum Terhubung"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Spreadsheet ID</span>
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                {googleSheets?.spreadsheetId || "-"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Terakhir Sinkron</span>
              <span className="text-foreground font-medium">{formatDate(googleSheets?.lastSyncedAt || null)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. PAYMENT RECORDS TABLE
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Riwayat Pembayaran Klien ({payments.length})</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daftar transfer konfirmasi yang diajukan oleh pemilik bisnis.
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Belum ada bukti pembayaran dari klien ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Referensi Transfer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-foreground">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold tabular-nums text-foreground">{formatIDR(p.amountIdr)}</td>
                    <td className="py-3 px-4 capitalize">{p.paymentMethod.replace("_", " ")}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground">{p.reference || "-"}</td>
                    <td className="py-3 px-4">
                      {p.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Menunggu
                        </span>
                      )}
                      {p.status === "confirmed" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Dikonfirmasi
                        </span>
                      )}
                      {p.status === "rejected" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold transition-colors"
                          >
                            Konfirmasi
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPaymentId(p.id);
                              setActiveModal("rejectPayment");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-semibold transition-colors"
                          >
                            Tolak
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. TENANT AUDIT TRAIL
      ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground">Audit Trail Tenant ({auditLogs.length})</h3>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Belum ada catatan audit khusus tenant ini.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted text-muted-foreground border border-border">
                      {log.new_status}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] mt-0.5">{log.notes || "-"}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-muted-foreground block text-[11px]">{formatDate(log.created_at)}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{log.actor_email || "System"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. MODALS
      ────────────────────────────────────────────────────────────── */}
      {/* 1. Modal Activate */}
      {activeModal === "activate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">Aktivasi Paket Langganan</h3>
            <p className="text-xs text-muted-foreground mb-4">Pilih paket dan durasi hari aktif untuk bisnis ini.</p>
            <form onSubmit={(e) => handleAction(adminActivateSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Pilihan Paket</label>
                <select
                  name="planCode"
                  defaultValue="basic"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name} ({formatIDR(p.priceIdr)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Durasi Hari Aktif</label>
                <input
                  type="number"
                  name="durationDays"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan Audit</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Aktivasi perdana klien pilot"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Konfirmasi pembayaran ini akan memperpanjang masa aktif langganan bisnis.
            </p>
            <form onSubmit={(e) => handleAction(adminConfirmPaymentAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Perpanjangan Hari (+)</label>
                <input
                  type="number"
                  name="extensionDays"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Bukti transfer valid / mutasi cocok"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-500 mb-1">Tolak Bukti Pembayaran</h3>
            <p className="text-xs text-muted-foreground mb-4">Berikan alasan mengapa bukti transfer ini ditolak.</p>
            <form onSubmit={(e) => handleAction(adminRejectPaymentAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Alasan Penolakan</label>
                <textarea
                  name="notes"
                  required
                  rows={3}
                  placeholder="Contoh: Bukti transfer tidak terbaca / nominal tidak sesuai"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Tolak Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Extend */}
      {activeModal === "extend" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">Perpanjang Masa Aktif</h3>
            <p className="text-xs text-muted-foreground mb-4">Tambahkan hari aktif ke siklus langganan yang berjalan.</p>
            <form onSubmit={(e) => handleAction(adminExtendSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Jumlah Hari Tambahan</label>
                <input
                  type="number"
                  name="days"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan Audit</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Kompensasi downtime / perpanjangan manual"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Simpan Perpanjangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Suspend */}
      {activeModal === "suspend" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-500 mb-1">Tangguhkan Akun Bisnis</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Penangguhan akan membatasi merchant dari pencatatan mutasi transaksi.
            </p>
            <form onSubmit={(e) => handleAction(adminSuspendSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Alasan Penangguhan</label>
                <textarea
                  name="notes"
                  required
                  rows={3}
                  placeholder="Contoh: Menunggak pembayaran tagihan lewat batas tenggang"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Tangguhkan Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Reactivate */}
      {activeModal === "reactivate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-sky-500 mb-1">Aktifkan Kembali Bisnis</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Mengembalikan status akun dari ditangguhkan menjadi aktif normal.
            </p>
            <form onSubmit={(e) => handleAction(adminReactivateSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Durasi Hari Aktif</label>
                <input
                  type="number"
                  name="days"
                  defaultValue={30}
                  min={1}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Catatan</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Pembayaran pelunasan telah diterima"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs"
                >
                  {isSubmitting ? "Memproses..." : "Reaktivasi Bisnis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Cancel */}
      {activeModal === "cancel" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-1">Batalkan Langganan</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Langganan akan dihentikan dan ditandai sebagai dibatalkan.
            </p>
            <form onSubmit={(e) => handleAction(adminCancelSubscriptionAction, e)} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Alasan Pembatalan</label>
                <textarea
                  name="notes"
                  required
                  rows={3}
                  placeholder="Contoh: Permintaan penutupan akun oleh pemilik usaha"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs border border-border"
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
