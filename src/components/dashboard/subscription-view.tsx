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
  Zap,
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            AKTIF
          </span>
        );
      case "trialing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            UJI COBA PILOT
          </span>
        );
      case "grace_period":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            MASA TENGGANG
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            DITANGGUHKAN
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-zinc-400">
            <XCircle className="w-3.5 h-3.5 text-zinc-500" />
            DIBATALKAN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-zinc-300 border border-white/10">
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
      {/* Top 4 Summary Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Paket Aktif */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Paket Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white truncate" title={plan.name}>
            {plan.name}
          </div>
          <div className="mt-2">{getStatusBadge()}</div>
        </div>

        {/* Metric 2: Sisa Masa Aktif */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sisa Masa Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {remainingDays}
            </span>
            <span className="text-xs text-zinc-400">Hari</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 truncate">
            {isTrial ? "Masa uji coba pilot gratis" : "Siklus langganan aktif"}
          </div>
        </div>

        {/* Metric 3: Batas Berlaku */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Batas Masa Berlaku
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-white truncate">
            {formatDate(currentPeriodEnd)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Pencatatan terjamin aktif
          </div>
        </div>

        {/* Metric 4: Status Pencatatan */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status Mutasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            {subscriptionState.canCreateMutations ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Pencatatan Dibuka
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Dibatasi
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Ledger & dashboard tersedia
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
            feedback.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          )}
          <div>{feedback.message}</div>
        </div>
      )}

      {/* Warning / Expiring Soon Banner */}
      {warningMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
            isSuspended
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : isGracePeriod
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-purple-500/10 border-purple-500/30 text-purple-300"
          }`}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1 text-white">
              {isSuspended
                ? "Operasional Ditangguhkan"
                : isGracePeriod
                ? "Peringatan Masa Tenggang"
                : "Pengingat Perpanjangan"}
            </p>
            <p className="text-xs opacity-90 leading-relaxed">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* Hero Plan Status Card */}
      <div className="bg-[#111726]/80 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-white">{plan.name}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-zinc-400">{plan.description}</p>
          </div>

          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-purple-900/30 active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Konfirmasi Pembayaran</span>
            </button>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block mb-1">Sisa Masa Aktif</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white font-mono">{remainingDays}</span>
              <span className="text-xs text-zinc-400">hari</span>
            </div>
            <span className="text-[11px] text-purple-300 block mt-1">
              {isTrial ? "Masa uji coba pilot gratis" : "Siklus langganan aktif"}
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block mb-1">Batas Masa Berlaku</span>
            <div className="text-sm font-semibold text-white">
              {formatDate(currentPeriodEnd)}
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Pencatatan transaksi terjamin hingga tanggal ini
            </span>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
            <span className="text-xs text-zinc-400 block mb-1">Status Pencatatan</span>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {subscriptionState.canCreateMutations ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400">Pencatatan Dibuka</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="text-rose-400">Pencatatan Dibatasi</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Riwayat dan dashboard selalu dapat diakses
            </span>
          </div>
        </div>
      </div>

      {/* Plan Choices Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Pilihan Paket Langganan</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pilih paket yang sesuai dengan skala dan kebutuhan operasional usaha Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = p.code === plan.code;
            return (
              <div
                key={p.code}
                className={`bg-[#111726]/80 border rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all backdrop-blur-md shadow-2xl ${
                  isCurrent
                    ? "border-purple-500/50 ring-2 ring-purple-500/30 shadow-purple-900/20"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">{p.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                        Paket Anda
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                      {p.priceIdr === 0 ? "Gratis" : formatIDR(p.priceIdr)}
                    </span>
                    {p.priceIdr > 0 && <span className="text-xs text-zinc-400">/ bulan</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{p.description}</p>
                  <ul className="space-y-2.5 text-xs text-zinc-300 mb-6">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
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
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-center border border-white/10 hover:bg-white/5 text-white transition-colors"
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
      <div className="bg-[#111726]/80 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            Instruksi Pembayaran Manual (Transfer Bank)
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed mt-1">
            Lakukan pembayaran ke rekening resmi OXID Ledger di bawah ini. Setelah transfer berhasil,
            klik tombol <strong>Konfirmasi Pembayaran</strong> dan cantumkan nomor referensi atau nama
            pengirim.
          </p>
        </div>

        {paymentSettings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {paymentSettings.map((setting) => (
              <div
                key={setting.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center"
              >
                <div>
                  <span className="text-zinc-400 block text-[11px] uppercase tracking-wider">{setting.bankName}</span>
                  <span className="font-mono font-bold text-white text-base">
                    {setting.maskedAccountNumber}
                  </span>
                  <span className="text-zinc-300 block text-xs mt-0.5">
                    a.n. {setting.accountName}
                  </span>
                  {setting.paymentInstructions && (
                    <span className="text-zinc-500 block text-[10px] mt-1">
                      {setting.paymentInstructions}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400">
            Detail pembayaran belum dikonfigurasi. Silakan hubungi admin OXID untuk aktivasi langganan.
          </div>
        )}

        <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-1 border-t border-white/5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Verifikasi pembayaran dilakukan secara aman oleh admin resmi OXID. Tidak ada biaya tersembunyi.
          </span>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-[#111726]/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="p-5 border-b border-white/10">
          <h3 className="text-sm font-bold text-white">Riwayat Pembayaran & Tagihan</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Daftar transaksi pembayaran langganan untuk bisnis ini.</p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Belum ada riwayat pembayaran yang tercatat.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-white/[0.02] text-zinc-400 border-b border-white/10 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Referensi Transfer</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {payments.map((p) => {
                  let statusBadge = (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Menunggu Verifikasi
                    </span>
                  );
                  if (p.status === "confirmed") {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Dikonfirmasi
                      </span>
                    );
                  } else if (p.status === "rejected") {
                    statusBadge = (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Ditolak
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 text-zinc-300">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-4 font-bold text-white font-mono">{formatIDR(p.amountIdr)}</td>
                      <td className="py-3 px-4 capitalize text-zinc-300">{p.paymentMethod.replace("_", " ")}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                        {p.reference || "-"}
                      </td>
                      <td className="py-3 px-4">{statusBadge}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111726] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl text-white animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white mb-1">Konfirmasi Pembayaran Langganan</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Masukkan data bukti transfer pembayaran untuk diverifikasi oleh admin OXID.
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Pilih Paket Langganan
                </label>
                <select
                  name="planCode"
                  value={selectedPlanCode}
                  onChange={(e) => setSelectedPlanCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  {plans
                    .filter((p) => p.priceIdr > 0)
                    .map((p) => (
                      <option key={p.code} value={p.code} className="bg-[#111726] text-white">
                        {p.name} ({formatIDR(p.priceIdr)} / {p.durationDays} hari)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Nominal Transfer Resmi (IDR)
                </label>
                <input
                  type="text"
                  readOnly
                  value={activePlanToPay ? formatIDR(activePlanToPay.priceIdr) : "Paket tidak valid"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-purple-300 font-bold text-sm focus:outline-none font-mono cursor-not-allowed"
                />
                <input type="hidden" name="amount" value={activePlanToPay?.priceIdr ?? 0} />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  name="paymentMethod"
                  defaultValue="manual_transfer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                >
                  <option value="manual_transfer" className="bg-[#111726] text-white">Transfer Bank Manual</option>
                  <option value="qris_manual" className="bg-[#111726] text-white">QRIS Pembayaran</option>
                  <option value="cash" className="bg-[#111726] text-white">Tunai / Mitra Langsung</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-300 block mb-1.5">
                  Nomor Referensi / Nama Rekening Pengirim
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Contoh: REF-9821 / a.n. Pengirim"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-purple-900/30 flex items-center gap-2"
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
