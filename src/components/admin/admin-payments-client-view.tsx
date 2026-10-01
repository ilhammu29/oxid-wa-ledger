"use client";

import { useState } from "react";
import { AdminPaymentListItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import { formatIDR } from "@/modules/subscriptions/plans";
import { adminConfirmPaymentAction, adminRejectPaymentAction } from "@/app/admin/actions";
import { Search } from "lucide-react";
import Link from "next/link";

interface AdminPaymentsClientViewProps {
  payments: AdminPaymentListItem[];
  adminRole: PlatformAdminRole;
}

export function AdminPaymentsClientView({
  payments,
  adminRole,
}: AdminPaymentsClientViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Modal State for Confirm Payment
  const [confirmModalPayment, setConfirmModalPayment] = useState<AdminPaymentListItem | null>(null);
  const [extensionDays, setExtensionDays] = useState(30);
  const [confirmNotes, setConfirmNotes] = useState("");

  // Modal State for Reject Payment
  const [rejectModalPayment, setRejectModalPayment] = useState<AdminPaymentListItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const canManagePayments = adminRole === "super_admin" || adminRole === "billing_admin";

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && p.status === statusFilter;
  });

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

  async function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmModalPayment || !canManagePayments) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("paymentId", confirmModalPayment.id);
    formData.append("businessId", confirmModalPayment.businessId);
    formData.append("extensionDays", extensionDays.toString());
    formData.append("notes", confirmNotes);

    const res = await adminConfirmPaymentAction(formData);
    setIsSubmitting(false);
    setConfirmModalPayment(null);
    setConfirmNotes("");

    if (res.success) {
      setFeedback({
        success: true,
        message: `Pembayaran ${confirmModalPayment.businessName} berhasil dikonfirmasi. Masa aktif bertambah +${extensionDays} hari.`,
      });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mengonfirmasi pembayaran." });
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModalPayment || !canManagePayments) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("paymentId", rejectModalPayment.id);
    formData.append("businessId", rejectModalPayment.businessId);
    formData.append("notes", rejectNotes);

    const res = await adminRejectPaymentAction(formData);
    setIsSubmitting(false);
    setRejectModalPayment(null);
    setRejectNotes("");

    if (res.success) {
      setFeedback({ success: true, message: `Bukti pembayaran ${rejectModalPayment.businessName} ditolak.` });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal menolak pembayaran." });
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
            placeholder="Cari bisnis atau nomor referensi..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto text-xs">
          {["all", "pending", "confirmed", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-semibold transition-colors ${
                statusFilter === st ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {st === "all" ? "Semua" : st === "pending" ? "Menunggu Verifikasi" : st === "confirmed" ? "Dikonfirmasi" : "Ditolak"}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-medium">
              <tr>
                <th className="py-3 px-4">Bisnis Pemohon</th>
                <th className="py-3 px-4">Nominal (IDR)</th>
                <th className="py-3 px-4">Metode & Referensi</th>
                <th className="py-3 px-4">Waktu Pengajuan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-500">
                    Tidak ada transaksi pembayaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  let statusBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  if (p.status === "confirmed") statusBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                  if (p.status === "rejected") statusBadge = "bg-rose-500/10 text-rose-400 border-rose-500/20";

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/admin/businesses/${p.businessId}`}
                          className="font-semibold text-zinc-100 hover:text-emerald-400 transition-colors"
                        >
                          {p.businessName}
                        </Link>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{p.id}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-100">
                        {formatIDR(p.amountIdr)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-zinc-200 capitalize font-medium">{p.paymentMethod.replace("_", " ")}</div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{p.reference || "-"}</div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400">{formatDate(p.createdAt)}</td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${statusBadge}`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {p.status === "pending" && canManagePayments ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setConfirmModalPayment(p);
                                setExtensionDays(30);
                              }}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold transition-colors"
                            >
                              Konfirmasi
                            </button>
                            <button
                              onClick={() => setRejectModalPayment(p)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {p.confirmedAt ? formatDate(p.confirmedAt) : "-"}
                          </span>
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

      {/* Confirm Payment Modal */}
      {confirmModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Verifikasi bukti transfer dari <strong>{confirmModalPayment.businessName}</strong> sebesar{" "}
              <strong className="text-emerald-400 font-mono">{formatIDR(confirmModalPayment.amountIdr)}</strong>.
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Masa Perpanjangan (Hari)
                </label>
                <input
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value, 10) || 30)}
                  min={1}
                  max={365}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Catatan Verifikasi (Opsional)
                </label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Contoh: Bukti mutasi BCA verified"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalPayment(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi & Tambah Masa Aktif"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Tolak Bukti Pembayaran</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tolak bukti pembayaran dari <strong>{rejectModalPayment.businessName}</strong>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Alasan Penolakan
                </label>
                <input
                  type="text"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Contoh: Nominal transfer tidak sesuai / mutasi tidak ditemukan"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors"
                >
                  {isSubmitting ? "Memproses..." : "Tolak Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
