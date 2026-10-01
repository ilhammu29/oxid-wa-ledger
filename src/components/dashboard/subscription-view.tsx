"use client";

import { useState } from "react";
import {
  SubscriptionStateResult,
  SubscriptionPayment,
  SubscriptionPlan,
  BillingPaymentSetting,
} from "@/modules/subscriptions/types";
import { formatIDR } from "@/modules/subscriptions/plans";
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

  // Status Badge Configuration
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            AKTIF
          </span>
        );
      case "trialing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Clock className="w-3.5 h-3.5" />
            UJI COBA PILOT
          </span>
        );
      case "grace_period":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            MASA TENGGANG
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            DITANGGUHKAN
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 border border-zinc-500/20 text-zinc-400">
            <XCircle className="w-3.5 h-3.5" />
            DIBATALKAN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
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

      {/* Warning / Expiring Soon Banner */}
      {warningMessage && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            isSuspended
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : isGracePeriod
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
          }`}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">
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

      {/* Subscription Status Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h2 className="text-lg font-bold text-zinc-100">{plan.name}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-zinc-400">{plan.description}</p>
          </div>

          {canManage && (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              Konfirmasi Pembayaran
            </button>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-500 block mb-1">Sisa Masa Aktif</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-zinc-100">{remainingDays}</span>
              <span className="text-xs text-zinc-400">hari</span>
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">
              {isTrial ? "Masa uji coba pilot gratis" : "Siklus langganan aktif"}
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-500 block mb-1">Batas Masa Berlaku</span>
            <div className="text-sm font-semibold text-zinc-200">
              {formatDate(currentPeriodEnd)}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">
              Pencatatan transaksi terjamin hingga tanggal ini
            </span>
          </div>

          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-500 block mb-1">Status Pencatatan</span>
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
            <span className="text-[11px] text-zinc-500 block mt-1">
              Riwayat dan dashboard selalu dapat diakses
            </span>
          </div>
        </div>
      </div>

      {/* Plan Choices Grid */}
      <div>
        <h3 className="text-base font-bold text-zinc-100 mb-3">Pilihan Paket Langganan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = p.code === plan.code;
            return (
              <div
                key={p.code}
                className={`bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? "border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-md shadow-emerald-500/5"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-zinc-100">{p.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Paket Anda
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-2xl font-extrabold text-zinc-100">
                      {p.priceIdr === 0 ? "Gratis" : formatIDR(p.priceIdr)}
                    </span>
                    {p.priceIdr > 0 && <span className="text-xs text-zinc-500">/ bulan</span>}
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">{p.description}</p>
                  <ul className="space-y-2 text-xs text-zinc-300 mb-6">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {canManage && !isCurrent && (
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-center border border-zinc-700 hover:bg-zinc-800 text-zinc-200 transition-colors"
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
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Instruksi Pembayaran Manual (Transfer Bank)
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
          Lakukan pembayaran ke rekening resmi OXID Ledger di bawah ini. Setelah transfer berhasil,
          klik tombol <strong>Konfirmasi Pembayaran</strong> dan cantumkan nomor referensi atau nama
          pengirim.
        </p>

        {paymentSettings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
            {paymentSettings.map((setting) => (
              <div
                key={setting.id}
                className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex justify-between items-center"
              >
                <div>
                  <span className="text-zinc-500 block text-[11px]">{setting.bankName}</span>
                  <span className="font-mono font-semibold text-zinc-200 text-sm">
                    {setting.maskedAccountNumber}
                  </span>
                  <span className="text-zinc-400 block text-[11px]">
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
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 mb-4">
            Detail pembayaran belum dikonfigurasi. Silakan hubungi admin OXID untuk aktivasi langganan.
          </div>
        )}

        <div className="text-[11px] text-zinc-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Verifikasi pembayaran dilakukan secara aman oleh admin resmi OXID. Tidak ada biaya tersembunyi.
          </span>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-100">Riwayat Pembayaran & Tagihan</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Daftar transaksi pembayaran langganan untuk bisnis ini.</p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Belum ada riwayat pembayaran yang tercatat.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {payments.map((p) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Menunggu Verifikasi
                    </span>
                  );
                  if (p.status === "confirmed") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Dikonfirmasi
                      </span>
                    );
                  } else if (p.status === "rejected") {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Ditolak
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-400">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-zinc-100">{formatIDR(p.amountIdr)}</td>
                      <td className="py-3 px-4 capitalize">{p.paymentMethod.replace("_", " ")}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-100 mb-1">Konfirmasi Pembayaran Langganan</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Masukkan data bukti transfer pembayaran untuk diverifikasi oleh admin OXID.
            </p>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Nominal Transfer (IDR)
                </label>
                <input
                  type="number"
                  name="amount"
                  defaultValue={plans.find((p) => p.code === "basic")?.priceIdr || 49000}
                  required
                  min={1000}
                  step={1000}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  name="paymentMethod"
                  defaultValue="manual_transfer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="manual_transfer">Transfer Bank Manual</option>
                  <option value="qris_manual">QRIS Pembayaran</option>
                  <option value="cash">Tunai / Mitra Langsung</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Nomor Referensi / Nama Rekening Pengirim
                </label>
                <input
                  type="text"
                  name="reference"
                  placeholder="Contoh: REF-9821 / a.n. Pengirim"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    "Mengirim..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Kirim Bukti Pembayaran
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
