"use client";

import { useState } from "react";
import { AdminSubscriptionListItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminExtendSubscriptionAction,
  adminSuspendSubscriptionAction,
  adminReactivateSubscriptionAction,
  adminCancelSubscriptionAction,
} from "@/app/admin/actions";
import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";

interface AdminSubscriptionsClientViewProps {
  subscriptions: AdminSubscriptionListItem[];
  adminRole: PlatformAdminRole;
}

export function AdminSubscriptionsClientView({
  subscriptions,
  adminRole,
}: AdminSubscriptionsClientViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Destructive action confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "cancel";
    sub: AdminSubscriptionListItem;
  } | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");

  const canMutate = adminRole === "super_admin" || adminRole === "billing_admin";

  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch =
      s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.businessId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  async function handleExtend(businessId: string, days: number = 30) {
    if (!canMutate) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("businessId", businessId);
    formData.append("days", days.toString());

    const res = await adminExtendSubscriptionAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: `Langganan berhasil diperpanjang +${days} hari.` });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal memperpanjang langganan." });
    }
  }

  async function handleReactivate(businessId: string) {
    if (!canMutate) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("businessId", businessId);
    formData.append("days", "30");

    const res = await adminReactivateSubscriptionAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: "Langganan berhasil direaktivasi (status aktif +30 hari)." });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mereaktivasi langganan." });
    }
  }

  async function handleConfirmDestructiveAction() {
    if (!confirmAction || !canMutate) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("businessId", confirmAction.sub.businessId);

    let res;
    if (confirmAction.type === "suspend") {
      res = await adminSuspendSubscriptionAction(formData);
    } else {
      res = await adminCancelSubscriptionAction(formData);
    }

    setIsSubmitting(false);
    setConfirmAction(null);
    setTypedConfirm("");

    if (res.success) {
      setFeedback({
        success: true,
        message:
          confirmAction.type === "suspend"
            ? "Langganan bisnis berhasil ditangguhkan."
            : "Langganan bisnis berhasil dibatalkan secara permanen.",
      });
    } else {
      setFeedback({ success: false, message: res.error || "Aksi gagal diproses." });
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.success
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-[11px] font-bold hover:underline">
            Tutup
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari bisnis atau paket..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto text-xs">
          {["all", "active", "trialing", "grace_period", "suspended", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                statusFilter === st ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {st === "all" ? "Semua" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">Nama Bisnis</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Akhir Periode</th>
                <th className="py-3 px-4">Sisa Masa Aktif</th>
                <th className="py-3 px-4 text-right">Aksi Siklus Hidup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500">
                    Tidak ada data langganan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  let statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (sub.status === "trialing") statusBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  if (sub.status === "grace_period") statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (sub.status === "suspended") statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                  if (sub.status === "cancelled") statusBadge = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";

                  return (
                    <tr key={sub.id} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/businesses/${sub.businessId}`}
                          className="font-semibold text-zinc-100 hover:text-emerald-400 transition-colors"
                        >
                          {sub.businessName}
                        </Link>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sub.businessId}</div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-zinc-200">{sub.planName}</td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${statusBadge}`}>
                          {sub.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">
                        {sub.status === "trialing" ? formatDate(sub.trialEndsAt) : formatDate(sub.currentPeriodEnd)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-100">
                        {sub.status === "cancelled" ? (
                          <span className="text-zinc-600">-</span>
                        ) : (
                          `${sub.remainingDays} hari`
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {canMutate ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {sub.status !== "cancelled" && sub.status !== "suspended" && (
                              <button
                                onClick={() => handleExtend(sub.businessId, 30)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold transition-colors"
                              >
                                +30 Hari
                              </button>
                            )}

                            {sub.status === "suspended" && (
                              <button
                                onClick={() => handleReactivate(sub.businessId)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                              >
                                Reaktivasi
                              </button>
                            )}

                            {sub.status !== "suspended" && sub.status !== "cancelled" && (
                              <button
                                onClick={() => setConfirmAction({ type: "suspend", sub })}
                                disabled={isSubmitting}
                                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors"
                              >
                                Tangguhkan
                              </button>
                            )}

                            {sub.status !== "cancelled" && (
                              <button
                                onClick={() => setConfirmAction({ type: "cancel", sub })}
                                disabled={isSubmitting}
                                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-rose-400 text-[11px] font-semibold transition-colors"
                              >
                                Batalkan
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">Read-Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Suspend / Cancel */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-zinc-100">
                {confirmAction.type === "suspend" ? "Konfirmasi Penangguhan Akun" : "Konfirmasi Pembatalan Langganan"}
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {confirmAction.type === "suspend" ? (
                <>
                  Penangguhan akan memblokir mutasi transaksi baru untuk bisnis{" "}
                  <strong className="text-zinc-200">{confirmAction.sub.businessName}</strong>. Data ledger masa lalu
                  tetap aman dan tersimpan.
                </>
              ) : (
                <>
                  Pembatalan langganan bersifat permanen untuk bisnis{" "}
                  <strong className="text-zinc-200">{confirmAction.sub.businessName}</strong>.
                </>
              )}
            </p>

            <p className="text-xs text-zinc-400">
              Ketik nama bisnis <span className="font-mono font-bold text-rose-400">{confirmAction.sub.businessName}</span>{" "}
              untuk mengonfirmasi:
            </p>

            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder={confirmAction.sub.businessName}
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setTypedConfirm("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDestructiveAction}
                disabled={typedConfirm !== confirmAction.sub.businessName || isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi Aksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
