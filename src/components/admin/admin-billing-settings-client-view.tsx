"use client";

import { useState } from "react";
import { BillingPaymentSetting, PlatformAdminRole } from "@/modules/subscriptions/types";
import {
  adminCreateBillingSettingAction,
  adminUpdateBillingSettingAction,
  adminDeleteBillingSettingAction,
} from "@/app/admin/actions";
import { Building2, Plus, Trash2, Edit3, X, CheckCircle2, AlertTriangle } from "lucide-react";

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
          2. TOP ACTION BAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">Daftar Metode & Rekening Tujuan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rekening berstatus AKTIF akan langsung tampil di dashboard merchant klien saat memilih pembayaran transfer.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingSetting(null);
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-colors shadow-2xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekening</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. SETTINGS GRID / CARDS
      ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settings.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <Building2 className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-xs text-foreground font-semibold">Belum ada rekening pembayaran yang dikonfigurasi.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              Dashboard pelanggan saat ini menampilkan pesan aman: &quot;Detail pembayaran belum dikonfigurasi&quot;.
            </p>
          </div>
        ) : (
          settings.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-card border border-border shadow-2xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-foreground">{s.bankName}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      s.active
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {s.active ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className="text-muted-foreground">
                    Atas Nama: <strong className="text-foreground">{s.accountName}</strong>
                  </p>
                  <p className="text-muted-foreground font-mono">
                    Nomor: <strong className="text-foreground">{s.maskedAccountNumber}</strong>
                  </p>
                  {s.paymentInstructions && (
                    <p className="text-[11px] text-muted-foreground mt-2 bg-muted/40 p-2.5 rounded-xl border border-border/60 leading-relaxed">
                      {s.paymentInstructions}
                    </p>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleActive(s)}
                    disabled={isSubmitting}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                      s.active
                        ? "bg-muted text-muted-foreground hover:text-foreground"
                        : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20"
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
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Ubah Rekening"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Hapus Rekening"
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

      {/* ─────────────────────────────────────────────────────────────
          4. ADD / EDIT MODAL
      ────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-base font-bold text-foreground">
              {editingSetting ? "Ubah Rekening Pembayaran" : "Tambah Rekening Pembayaran Baru"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nomor rekening yang dimasukkan di sini akan langsung ditampilkan ke merchant saat membayar langganan.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nama Bank / Kanal</label>
                <input
                  type="text"
                  name="bankName"
                  defaultValue={editingSetting?.bankName || ""}
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nama Pemilik Akun</label>
                <input
                  type="text"
                  name="accountName"
                  defaultValue={editingSetting?.accountName || ""}
                  placeholder="Contoh: PT OXID SISTEM INDONESIA"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  name="maskedAccountNumber"
                  defaultValue={editingSetting?.maskedAccountNumber || ""}
                  placeholder="Contoh: 8830123456 atau 8830-123-456"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Petunjuk Pembayaran (Opsional)</label>
                <textarea
                  name="paymentInstructions"
                  defaultValue={editingSetting?.paymentInstructions || ""}
                  placeholder="Contoh: Cantumkan ID Bisnis atau Nama Usaha pada berita transfer"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  defaultChecked={editingSetting ? editingSetting.active : true}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="active" className="text-xs font-medium text-foreground select-none">
                  Aktifkan rekening ini sekarang
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingSetting(null);
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Rekening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
