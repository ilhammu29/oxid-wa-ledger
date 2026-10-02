"use client";

import { useState } from "react";
import { AdminPaymentListItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import { formatIDR } from "@/modules/subscriptions/plans";
import { adminConfirmPaymentAction, adminRejectPaymentAction } from "@/app/admin/actions";
import { Search, CheckCircle2, AlertTriangle, X } from "lucide-react";
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
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.businessName.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "confirmed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
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
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. FEEDBACK BANNER
      ────────────────────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
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
          <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-muted/30 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER & SEARCH TOOLBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari bisnis atau nomor referensi..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-muted/40 border border-border/80 text-xs">
          {[
            { key: "all", label: `Semua (${payments.length})` },
            { key: "pending", label: "Menunggu" },
            { key: "confirmed", label: "Dikonfirmasi" },
            { key: "rejected", label: "Ditolak" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === st.key
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PAYMENTS TABLE FOR DESKTOP (>= 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Bisnis Pemohon & ID</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Metode & Referensi</th>
                <th className="py-3 px-4">Waktu Pengajuan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada transaksi pembayaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/businesses/${p.businessId}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors block"
                      >
                        {p.businessName}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.id}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold tabular-nums text-foreground">
                      {formatIDR(p.amountIdr)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-foreground capitalize font-medium">{p.paymentMethod.replace("_", " ")}</div>
                      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{p.reference || "-"}</div>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{formatDate(p.createdAt)}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          p.status
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {p.status === "pending" && canManagePayments ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setConfirmModalPayment(p);
                              setExtensionDays(30);
                            }}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-xs font-semibold transition-colors"
                          >
                            Konfirmasi
                          </button>
                          <button
                            onClick={() => setRejectModalPayment(p)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-semibold transition-colors"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {p.confirmedAt ? formatDate(p.confirmedAt) : "-"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. RESPONSIVE STRUCTURED CARDS FOR MOBILE (< 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filteredPayments.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            Tidak ada pembayaran yang cocok dengan filter.
          </div>
        ) : (
          filteredPayments.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/businesses/${p.businessId}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors block"
                  >
                    {p.businessName}
                  </Link>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.id}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${getStatusBadge(
                    p.status
                  )}`}
                >
                  {p.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Nominal:</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {formatIDR(p.amountIdr)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Metode:</span>
                  <span className="capitalize text-foreground font-medium">{p.paymentMethod.replace("_", " ")}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-muted-foreground block">Referensi Transfer:</span>
                  <span className="font-mono text-foreground font-medium">{p.reference || "-"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-muted-foreground block">Waktu Pengajuan:</span>
                  <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
                </div>
              </div>

              {p.status === "pending" && canManagePayments && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setConfirmModalPayment(p);
                      setExtensionDays(30);
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                  >
                    Konfirmasi Bukti
                  </button>
                  <button
                    onClick={() => setRejectModalPayment(p)}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-semibold transition-colors"
                  >
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CONFIRM PAYMENT MODAL
      ────────────────────────────────────────────────────────────── */}
      {confirmModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Konfirmasi Pembayaran</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verifikasi transfer dari <strong className="text-foreground">{confirmModalPayment.businessName}</strong> sebesar{" "}
              <strong className="text-emerald-500 font-mono">{formatIDR(confirmModalPayment.amountIdr)}</strong>.
            </p>

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Masa Perpanjangan (Hari)
                </label>
                <input
                  type="number"
                  value={extensionDays}
                  onChange={(e) => setExtensionDays(parseInt(e.target.value, 10) || 30)}
                  min={1}
                  max={365}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Catatan Verifikasi (Opsional)
                </label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  placeholder="Contoh: Bukti mutasi BCA verified"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModalPayment(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors"
                >
                  {isSubmitting ? "Memproses..." : "Konfirmasi & Perpanjang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. REJECT PAYMENT MODAL
      ────────────────────────────────────────────────────────────── */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-500">Tolak Bukti Pembayaran</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tolak bukti pembayaran dari <strong className="text-foreground">{rejectModalPayment.businessName}</strong>.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">
                  Alasan Penolakan
                </label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Contoh: Nominal transfer tidak sesuai / mutasi tidak ditemukan"
                  required
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalPayment(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
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
