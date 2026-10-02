"use client";

import { useState } from "react";
import { AdminSubscriptionListItem, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminExtendSubscriptionAction,
  adminSuspendSubscriptionAction,
  adminReactivateSubscriptionAction,
  adminCancelSubscriptionAction,
} from "@/app/admin/actions";
import { AlertTriangle, Search, X, CheckCircle2 } from "lucide-react";
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
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.businessName.toLowerCase().includes(q) ||
      s.businessId.toLowerCase().includes(q) ||
      s.planName.toLowerCase().includes(q);

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "trialing":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "grace_period":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "cancelled":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
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
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-muted/30 transition-colors"
          >
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
            placeholder="Cari bisnis atau paket..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-muted/40 border border-border/80 text-xs">
          {["all", "active", "trialing", "grace_period", "suspended", "cancelled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-colors ${
                statusFilter === st
                  ? "bg-card text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st === "all" ? `Semua (${subscriptions.length})` : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SUBSCRIPTIONS TABLE FOR DESKTOP (>= 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Bisnis & ID</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Akhir Periode</th>
                <th className="py-3 px-4 text-right">Sisa Hari</th>
                <th className="py-3 px-4 text-right">Aksi Siklus Hidup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data langganan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/businesses/${sub.businessId}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors block"
                      >
                        {sub.businessName}
                      </Link>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub.businessId}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-foreground capitalize">{sub.planName}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          sub.status
                        )}`}
                      >
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {sub.status === "trialing" ? formatDate(sub.trialEndsAt) : formatDate(sub.currentPeriodEnd)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-foreground">
                      {sub.status === "cancelled" ? (
                        <span className="text-muted-foreground/40">-</span>
                      ) : (
                        `${sub.remainingDays} hari`
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {canMutate ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.status !== "cancelled" && sub.status !== "suspended" && (
                            <button
                              onClick={() => handleExtend(sub.businessId, 30)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold transition-colors border border-border"
                            >
                              +30 Hari
                            </button>
                          )}

                          {sub.status === "suspended" && (
                            <button
                              onClick={() => handleReactivate(sub.businessId)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 text-[11px] font-semibold border border-sky-500/20 transition-colors"
                            >
                              Reaktivasi
                            </button>
                          )}

                          {sub.status !== "suspended" && sub.status !== "cancelled" && (
                            <button
                              onClick={() => setConfirmAction({ type: "suspend", sub })}
                              disabled={isSubmitting}
                              className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 text-[11px] font-medium transition-colors"
                            >
                              Tangguhkan
                            </button>
                          )}

                          {sub.status !== "cancelled" && (
                            <button
                              onClick={() => setConfirmAction({ type: "cancel", sub })}
                              disabled={isSubmitting}
                              className="px-2 py-1 rounded-lg text-muted-foreground hover:bg-muted text-[11px] font-medium transition-colors"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40 text-[11px]">-</span>
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
        {filteredSubs.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            Tidak ada langganan yang cocok dengan filter.
          </div>
        ) : (
          filteredSubs.map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/businesses/${sub.businessId}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors block"
                  >
                    {sub.businessName}
                  </Link>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{sub.businessId}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${getStatusBadge(
                    sub.status
                  )}`}
                >
                  {sub.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Paket:</span>
                  <span className="font-semibold text-foreground capitalize">{sub.planName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Sisa Hari:</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {sub.status === "cancelled" ? "-" : `${sub.remainingDays} hari`}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-muted-foreground block">Berlaku Hingga:</span>
                  <span className="text-foreground font-medium">
                    {sub.status === "trialing" ? formatDate(sub.trialEndsAt) : formatDate(sub.currentPeriodEnd)}
                  </span>
                </div>
              </div>

              {canMutate && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {sub.status !== "cancelled" && sub.status !== "suspended" && (
                    <button
                      onClick={() => handleExtend(sub.businessId, 30)}
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors"
                    >
                      +30 Hari
                    </button>
                  )}

                  {sub.status === "suspended" && (
                    <button
                      onClick={() => handleReactivate(sub.businessId)}
                      disabled={isSubmitting}
                      className="flex-1 py-1.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-xs font-semibold transition-colors"
                    >
                      Reaktivasi
                    </button>
                  )}

                  {sub.status !== "suspended" && sub.status !== "cancelled" && (
                    <button
                      onClick={() => setConfirmAction({ type: "suspend", sub })}
                      disabled={isSubmitting}
                      className="py-1.5 px-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-semibold border border-rose-500/20 transition-colors"
                    >
                      Tangguhkan
                    </button>
                  )}

                  {sub.status !== "cancelled" && (
                    <button
                      onClick={() => setConfirmAction({ type: "cancel", sub })}
                      disabled={isSubmitting}
                      className="py-1.5 px-3 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors border border-border"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. DESTRUCTIVE ACTION CONFIRMATION MODAL
      ────────────────────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-base text-foreground">
                {confirmAction.type === "suspend" ? "Tangguhkan Langganan" : "Batalkan Langganan"}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {confirmAction.type === "suspend"
                ? "Penangguhan akan membatasi tenant dari mutasi transaksi baru hingga diaktifkan kembali."
                : "Pembatalan akan mengakhiri siklus langganan bisnis ini secara permanen."}
            </p>
            <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
              <p className="font-semibold text-foreground">{confirmAction.sub.businessName}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{confirmAction.sub.businessId}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground block">
                Ketik{" "}
                <strong className="text-foreground font-mono">
                  {confirmAction.type === "suspend" ? "TANGGUHKAN" : "BATALKAN"}
                </strong>{" "}
                untuk konfirmasi:
              </label>
              <input
                type="text"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                placeholder={confirmAction.type === "suspend" ? "TANGGUHKAN" : "BATALKAN"}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAction(null);
                  setTypedConfirm("");
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  typedConfirm !== (confirmAction.type === "suspend" ? "TANGGUHKAN" : "BATALKAN") ||
                  isSubmitting
                }
                onClick={handleConfirmDestructiveAction}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
              >
                {isSubmitting ? "Memproses..." : "Konfirmasi Tindakan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
