"use client";

import { useState } from "react";
import {
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Info,
  Smartphone,
  Lock,
} from "lucide-react";
import { saveChannelSettingsAction } from "@/app/dashboard/actions";
import { WhatsAppReadiness } from "@/modules/channels/types";

interface ChannelsViewProps {
  settings: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    primaryChannel: "telegram" | "whatsapp";
    reminderChannel: "telegram" | "whatsapp";
  };
  readiness: WhatsAppReadiness;
  role: "owner" | "admin" | "member";
}

export function ChannelsView({ settings, readiness, role }: ChannelsViewProps) {
  const [telegramEnabled, setTelegramEnabled] = useState(settings.telegramEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled);
  const [primaryChannel, setPrimaryChannel] = useState<"telegram" | "whatsapp">(
    settings.primaryChannel
  );
  const [reminderChannel, setReminderChannel] = useState<"telegram" | "whatsapp">(
    settings.reminderChannel
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canEdit = role === "owner" || role === "admin";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.set("telegramEnabled", String(telegramEnabled));
      formData.set("whatsappEnabled", String(whatsappEnabled));
      formData.set("primaryChannel", primaryChannel);
      formData.set("reminderChannel", reminderChannel);

      const res = await saveChannelSettingsAction(formData);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(res.error || "Gagal menyimpan pengaturan channel.");
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            Pengaturan kanal komunikasi berhasil disimpan.
          </p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">{saveError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">Telegram Bot Adapter</h3>
                  <p className="text-xs text-zinc-500">Kanal operasional cepat & pengingat</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  telegramEnabled
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    telegramEnabled ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
                />
                {telegramEnabled ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-800">Aktifkan Kanal Telegram</p>
                  <p className="text-[11px] text-zinc-500">
                    Menerima perintah /sale, /batal, /status, dan pengingat via Telegram Bot.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramEnabled}
                    onChange={(e) => setTelegramEnabled(e.target.checked)}
                    disabled={!canEdit}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                <div className="flex items-center gap-2 text-zinc-800 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Kesiapan Telegram
                </div>
                <p className="text-[11px] text-zinc-500">
                  Bot token dan webhook terkonfigurasi. Mendukung percakapan interaktif dan pengingat harian.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-100">
            Kanal utama untuk pengingat otomatis saat ini.
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-sm">Meta WhatsApp Cloud API</h3>
                  <p className="text-xs text-zinc-500">Kanal utama komunikasi WhatsApp</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  readiness.ready
                    ? whatsappEnabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    readiness.ready
                      ? whatsappEnabled
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                      : "bg-zinc-400"
                  }`}
                />
                {readiness.ready
                  ? whatsappEnabled
                    ? "Aktif"
                    : "Siap (Nonaktif)"
                  : "Belum Siap"}
              </span>
            </div>

            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-800">Aktifkan Kanal WhatsApp</p>
                  <p className="text-[11px] text-zinc-500">
                    Memproses webhook pesan masuk dan mengirim balasan via WhatsApp.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => {
                      if (!readiness.ready && e.target.checked) {
                        setSaveError(
                          `Kanal WhatsApp belum dapat diaktifkan: ${readiness.missingRequirements.join(
                            " "
                          )}`
                        );
                        return;
                      }
                      setWhatsappEnabled(e.target.checked);
                    }}
                    disabled={!canEdit || (!readiness.ready && !whatsappEnabled)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Readiness Checklist */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                <p className="text-xs font-semibold text-zinc-800">Checklist Kesiapan WhatsApp</p>
                <ul className="text-xs space-y-1.5">
                  <li className="flex items-center gap-2">
                    {readiness.hasActiveConnection ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={
                        readiness.hasActiveConnection ? "text-zinc-700" : "text-zinc-500"
                      }
                    >
                      Koneksi WhatsApp Aktif
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {readiness.hasPhoneNumberId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={
                        readiness.hasPhoneNumberId ? "text-zinc-700" : "text-zinc-500"
                      }
                    >
                      Phone Number ID Terdaftar
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {readiness.hasAuthorizedSenders ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span
                      className={
                        readiness.hasAuthorizedSenders ? "text-zinc-700" : "text-zinc-500"
                      }
                    >
                      Minimal 1 Operator WhatsApp Terdaftar
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-100">
            Membutuhkan Meta WABA terverifikasi dan App subscription.
          </div>
        </div>
      </div>

      {/* Channel Routing Configuration */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
        <div>
          <h3 className="font-semibold text-zinc-900 text-sm">Perutean Kanal (Routing)</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tentukan prioritas kanal komunikasi dan target pengingat otomatis bisnis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Channel */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Kanal Utama (Primary Channel)
            </label>
            <select
              value={primaryChannel}
              onChange={(e) => setPrimaryChannel(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="telegram">Telegram (Direkomendasikan saat ini)</option>
              <option value="whatsapp" disabled={!readiness.ready}>
                WhatsApp {!readiness.ready ? "(Belum Siap)" : ""}
              </option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Kanal acuan utama untuk komunikasi instruksi bisnis sehari-hari.
            </p>
          </div>

          {/* Reminder Channel */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Kanal Pengingat Otomatis (Reminder Channel)
            </label>
            <select
              value={reminderChannel}
              onChange={(e) => setReminderChannel(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="telegram">Telegram (Aktif & Teruji)</option>
              <option value="whatsapp" disabled>
                WhatsApp (Terkunci — Butuh Template Meta)
              </option>
            </select>
            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Reminder via WhatsApp diblokir otomatis demi kepatuhan Meta Policy sampai implementasi template production di Step 8.
              </span>
            </div>
          </div>
        </div>

        {/* Data Safety Notice */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-zinc-800">Jaminan Keamanan Data & Sumber Kebenaran</p>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Pengalihan atau penonaktifan kanal pesan tidak akan pernah menghapus data transaksi,
              saldo ledger, maupun riwayat percakapan. Seluruh mutasi keuangan tersimpan aman secara terpusat di PostgreSQL Supabase.
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {canEdit && (
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            <Radio className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Pengaturan Kanal"}
          </button>
        </div>
      )}
    </form>
  );
}
