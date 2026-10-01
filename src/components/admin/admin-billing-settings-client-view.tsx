"use client";

import { useState } from "react";
import { BillingPaymentSetting, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminCreateBillingSettingAction,
  adminUpdateBillingSettingAction,
  adminDeleteBillingSettingAction,
} from "@/app/admin/actions";
import { Building2, Plus, Trash2, Edit3 } from "lucide-react";

interface AdminBillingSettingsClientViewProps {
  settings: BillingPaymentSetting[];
  adminRole: PlatformAdminRole;
}

export function AdminBillingSettingsClientView({
  settings,
  adminRole,
}: AdminBillingSettingsClientViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<BillingPaymentSetting | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const canManage = adminRole === "super_admin" || adminRole === "billing_admin";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);

    let res;
    if (editingSetting) {
      formData.append("id", editingSetting.id);
      res = await adminUpdateBillingSettingAction(formData);
    } else {
      res = await adminCreateBillingSettingAction(formData);
    }

    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        success: true,
        message: editingSetting
          ? "Pengaturan rekening berhasil diperbarui."
          : "Rekening baru berhasil ditambahkan.",
      });
      setModalOpen(false);
      setEditingSetting(null);
    } else {
      setFeedback({ success: false, message: res.error || "Gagal menyimpan pengaturan." });
    }
  }

  async function handleToggleActive(setting: BillingPaymentSetting) {
    if (!canManage) return;
    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("id", setting.id);
    formData.append("active", (!setting.active).toString());

    const res = await adminUpdateBillingSettingAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        success: true,
        message: `Status rekening ${setting.bankName} berhasil diubah menjadi ${!setting.active ? "AKTIF" : "NONAKTIF"}.`,
      });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal mengubah status aktif." });
    }
  }

  async function handleDelete(setting: BillingPaymentSetting) {
    if (!canManage) return;
    if (!confirm(`Hapus rekening ${setting.bankName} (${setting.accountName})?`)) return;

    setIsSubmitting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("id", setting.id);

    const res = await adminDeleteBillingSettingAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({ success: true, message: `Rekening ${setting.bankName} berhasil dihapus.` });
    } else {
      setFeedback({ success: false, message: res.error || "Gagal menghapus rekening." });
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

      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-100">Daftar Metode & Rekening Tujuan</h2>
          <p className="text-xs text-zinc-400">
            Rekening berstatus AKTIF akan langsung tampil di dashboard merchant klien saat memilih pembayaran transfer.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingSetting(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekening</span>
          </button>
        )}
      </div>

      {/* Settings Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
            <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 font-medium">Belum ada rekening pembayaran yang dikonfigurasi.</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Dashboard pelanggan saat ini menampilkan pesan aman: &quot;Detail pembayaran belum dikonfigurasi&quot;.
            </p>
          </div>
        ) : (
          settings.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-zinc-100">{s.bankName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      s.active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {s.active ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-zinc-400">
                    Atas Nama: <strong className="text-zinc-200">{s.accountName}</strong>
                  </p>
                  <p className="text-zinc-400 font-mono">
                    Nomor: <strong className="text-emerald-400">{s.maskedAccountNumber}</strong>
                  </p>
                  {s.paymentInstructions && (
                    <p className="text-[11px] text-zinc-500 mt-2 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                      {s.paymentInstructions}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleActive(s)}
                    disabled={isSubmitting}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      s.active
                        ? "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    }`}
                  >
                    {s.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingSetting(s);
                        setModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 transition-colors"
                      title="Ubah"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg bg-zinc-850 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100">
              {editingSetting ? "Ubah Rekening Pembayaran" : "Tambah Rekening Pembayaran Baru"}
            </h3>
            <p className="text-xs text-zinc-400">
              Pastikan nama rekening dan nomor akun akurat. Nomor rekening yang dimasukkan di sini akan ditampilkan ke merchant.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Nama Bank / Kanal</label>
                <input
                  type="text"
                  name="bankName"
                  defaultValue={editingSetting?.bankName || ""}
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Atas Nama (Rekening)</label>
                <input
                  type="text"
                  name="accountName"
                  defaultValue={editingSetting?.accountName || ""}
                  placeholder="Contoh: PT OXID TEKNOLOGI INDONESIA"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  name="maskedAccountNumber"
                  defaultValue={editingSetting?.maskedAccountNumber || ""}
                  placeholder="Contoh: 8830-123-456 atau 8830****456"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Instruksi Transfer (Opsional)</label>
                <textarea
                  name="paymentInstructions"
                  defaultValue={editingSetting?.paymentInstructions || ""}
                  rows={2}
                  placeholder="Contoh: Masukkan berita transfer kode bisnis Anda. Admin akan verifikasi max 1x24 jam."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  id="activeCheck"
                  defaultChecked={editingSetting?.active ?? true}
                  className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="activeCheck" className="text-xs text-zinc-300">
                  Aktifkan langsung untuk pelanggan
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingSetting(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
