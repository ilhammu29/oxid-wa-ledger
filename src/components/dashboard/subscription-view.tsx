"use client";

import { useState } from "react";
import {
  SubscriptionStateResult,
  SubscriptionPayment,
  SubscriptionPlan,
  BillingPaymentSetting,
} from "@/modules/subscriptions/types";
import { formatIDR, getPlanByCode } from "@/modules/subscriptions/plans";
import { submitManualPaymentAction } from "@/app/dashboard/actions";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  XCircle,
  Building2,
  Info,
  Calendar,
} from "lucide-react";

interface SubscriptionViewProps {
  subscriptionState: SubscriptionStateResult;
  payments: SubscriptionPayment[];
  plans: SubscriptionPlan[];
  role: "owner" | "admin" | "member";
  paymentSettings?: BillingPaymentSetting[];
}

export function SubscriptionView({
  subscriptionState,
  payments,
  plans,
  role,
  paymentSettings = [],
}: SubscriptionViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const canManage = role === "owner" || role === "admin";
  const { plan, status, remainingDays, currentPeriodEnd, isTrial, isGracePeriod, isSuspended, warningMessage } =
    subscriptionState;

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(
    plan.code === "pro" ? "pro" : "basic"
  );
  const activePlanToPay = plans.find((p) => p.code === selectedPlanCode) ?? getPlanByCode(selectedPlanCode);

  // Status Badge Configuration
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Aktif
          </span>
        );
      case "trialing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Uji Coba Pilot
          </span>
        );
      case "grace_period":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Masa Tenggang
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Ditangguhkan
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover border border-border text-muted">
            <XCircle className="w-3.5 h-3.5 text-muted" />
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-muted border border-border">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  async function handlePaymentSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const res = await submitManualPaymentAction(formData);

    setIsSubmitting(false);
    if (res.success) {
      setFeedback({
        success: true,
        message: "Konfirmasi pembayaran berhasil dikirim. Admin akan memverifikasi dalam waktu 1x24 jam kerja.",
      });
      setModalOpen(false);
    } else {
      setFeedback({
        success: false,
        message: res.error || "Gagal mengirim konfirmasi pembayaran.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Langganan
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Kelola paket dan status langganan OXID Ledger.
        </p>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          )}
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Warning / Expiring Soon Banner */}
      {warningMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            isSuspended
              ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
              : isGracePeriod
              ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">
              {isSuspended
                ? "Operasional Ditangguhkan"
                : isGracePeriod
                ? "Peringatan Masa Tenggang"
                : "Pengingat Perpanjangan"}
            </p>
            <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="rounded-xl bg-surface border border-border shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-foreground">{plan.name}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-muted mt-1">{plan.description}</p>
          </div>

          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs transition shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Konfirmasi Pembayaran</span>
            </button>
          )}
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface-hover/50 border border-border rounded-xl p-3.5">
            <span className="text-xs text-muted block mb-0.5">Sisa Masa Aktif</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{remainingDays}</span>
              <span className="text-xs text-muted">hari tersisa</span>
            </div>
            <span className="text-[11px] text-muted block mt-1">
              {isTrial ? "Masa uji coba pilot gratis" : "Siklus langganan aktif"}
            </span>
          </div>

          <div className="bg-surface-hover/50 border border-border rounded-xl p-3.5">
            <span className="text-xs text-muted block mb-0.5">Batas Berlaku</span>
            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              <span>{formatDate(currentPeriodEnd)}</span>
            </div>
            <span className="text-[11px] text-muted block mt-1">
              Pencatatan transaksi terjamin
            </span>
          </div>

          <div className="bg-surface-hover/50 border border-border rounded-xl p-3.5">
            <span className="text-xs text-muted block mb-0.5">Status Pencatatan Mutasi</span>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {subscriptionState.canCreateMutations ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-300">Pencatatan Dibuka</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-rose-700 dark:text-rose-300">Dibatasi</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-muted block mt-1">
              Dashboard & riwayat selalu dapat diakses
            </span>
          </div>
        </div>
      </div>

      {/* Plan Choices Grid */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Pilihan Paket Langganan</h3>
          <p className="text-xs text-muted mt-0.5">
            Pilih paket yang sesuai dengan skala usaha dan jumlah operator kasir Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {plans.map((p) => {
            const isCurrent = p.code === plan.code;
            return (
              <div
                key={p.code}
                className={`rounded-xl bg-surface border shadow-xs p-4 flex flex-col justify-between transition-colors ${
                  isCurrent
                    ? "border-primary/50 ring-1 ring-primary/30"
                    : "border-border hover:border-border/80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Paket Anda
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 my-2">
                    <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {p.priceIdr === 0 ? "Gratis" : formatIDR(p.priceIdr)}
                    </span>
                    {p.priceIdr > 0 && <span className="text-xs text-muted">/ bulan</span>}
                  </div>
                  <p className="text-xs text-muted mb-4 leading-relaxed">{p.description}</p>
                  <ul className="space-y-2 text-xs text-foreground mb-4">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {canManage && !isCurrent && (
                  <button
                    onClick={() => {
                      setSelectedPlanCode(p.code);
                      setModalOpen(true);
                    }}
                    className="w-full py-2 rounded-lg text-xs font-medium text-center border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors mt-2 shadow-xs"
                  >
                    Pilih Paket Ini
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Bank Transfer Instructions */}
      <div className="rounded-xl bg-surface border border-border shadow-xs p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-primary" />
            Instruksi Pembayaran Manual (Transfer Bank)
          </h3>
          <p className="text-xs text-muted leading-relaxed mt-0.5">
            Lakukan transfer ke rekening resmi OXID Ledger di bawah ini. Setelah transfer berhasil, klik <strong>Konfirmasi Pembayaran</strong> dan cantumkan nomor referensi.
          </p>
        </div>

        {paymentSettings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {paymentSettings.map((setting) => (
              <div
                key={setting.id}
                className="p-3.5 rounded-xl bg-surface-hover/50 border border-border space-y-1"
              >
                <span className="text-muted block text-[11px] uppercase tracking-wider font-medium">{setting.bankName}</span>
                <span className="font-mono font-bold text-foreground text-sm block">
                  {setting.maskedAccountNumber}
                </span>
                <span className="text-muted block text-xs">
                  a.n. {setting.accountName}
                </span>
                {setting.paymentInstructions && (
                  <span className="text-muted block text-[11px] pt-1">
                    {setting.paymentInstructions}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-surface-hover/40 border border-border text-xs text-muted">
            Detail pembayaran belum dikonfigurasi. Silakan hubungi admin OXID untuk aktivasi langganan.
          </div>
        )}

        <div className="text-[11px] text-muted flex items-center gap-1.5 pt-1 border-t border-border">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>
            Verifikasi pembayaran diproses secara aman oleh admin resmi OXID. Tidak ada biaya tersembunyi.
          </span>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="rounded-xl bg-surface border border-border shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Riwayat Pembayaran & Tagihan</h3>
          <p className="text-xs text-muted mt-0.5">Daftar transaksi pembayaran langganan untuk bisnis ini.</p>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted">
            Belum ada riwayat pembayaran yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-surface-hover/50 text-muted border-b border-border uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5">Tanggal</th>
                  <th className="py-2.5 px-3.5">Nominal</th>
                  <th className="py-2.5 px-3.5">Metode</th>
                  <th className="py-2.5 px-3.5">Referensi</th>
                  <th className="py-2.5 px-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                      Menunggu Verifikasi
                    </span>
                  );
                  if (p.status === "confirmed") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Dikonfirmasi
                      </span>
                    );
                  } else if (p.status === "rejected") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                        Ditolak
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="py-3 px-3.5 text-muted">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-3.5 font-semibold text-foreground tabular-nums">{formatIDR(p.amountIdr)}</td>
                      <td className="py-3 px-3.5 capitalize text-muted">{p.paymentMethod.replace("_", " ")}</td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-[11px] text-muted">
                        {p.reference || "-"}
                      </td>
                      <td className="py-3 px-3.5">{statusBadge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Payment Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="rounded-xl bg-surface border border-border max-w-md w-full p-5 shadow-xl text-foreground space-y-3.5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Konfirmasi Pembayaran Langganan</h3>
              <p className="text-xs text-muted mt-0.5">
                Masukkan bukti transfer untuk diverifikasi oleh admin OXID.
              </p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Pilih Paket
                </label>
                <select
                  name="planCode"
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                >
                  {plans
                    .filter((p) => p.priceIdr > 0)
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({formatIDR(p.priceIdr)} / {p.durationDays} hari)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nominal Transfer
                </label>
                <input
                  type="text"
                  readOnly
                  value={activePlanToPay ? formatIDR(activePlanToPay.priceIdr) : "Paket tidak valid"}
                  className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-foreground font-semibold text-xs focus:outline-none tabular-nums cursor-not-allowed"
                />
                <input type="hidden" name="amount" value={activePlanToPay?.priceIdr ?? 0} />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Metode Pembayaran
                </label>
                <select
                  name="paymentMethod"
                  defaultValue="manual_transfer"
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary transition"
                >
                  <option value="manual_transfer">Transfer Bank Manual</option>
                  <option value="qris_manual">QRIS Pembayaran</option>
                  <option value="cash">Tunai / Mitra Langsung</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Nomor Referensi / Nama Pengirim
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Contoh: REF-9821 / a.n. Pengirim"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    "Mengirim..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Bukti Pembayaran</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
