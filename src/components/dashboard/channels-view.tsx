"use client";

import { useState } from "react";
import {
  Radio,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Info,
  Smartphone,
  Lock,
  UserPlus,
  Trash2,
  Bell,
  AlertTriangle,
  ArrowRightLeft,
  FileCode2,
} from "lucide-react";
import {
  saveChannelSettingsAction,
  addWhatsAppAuthorizedSenderAction,
  updateWhatsAppAuthorizedSenderAction,
  deleteWhatsAppAuthorizedSenderAction,
  saveWhatsAppTemplateAction,
  unlinkTelegramOperatorAction,
} from "@/app/dashboard/actions";
import { WhatsAppReadiness, WhatsAppConnectionStatus } from "@/modules/channels/types";

export interface WhatsAppAuthorizedSenderItem {
  id: string;
  phoneNumber: string;
  displayLabel?: string | null;
  active: boolean;
  receiveReminders: boolean;
  createdAt: string;
}

export interface TelegramAuthorizedOperatorItem {
  id: string;
  telegramUserId: number;
  displayLabel?: string | null;
  active: boolean;
  createdAt: string;
}

interface ChannelsViewProps {
  settings: {
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    primaryChannel: "telegram" | "whatsapp";
    reminderChannel: "telegram" | "whatsapp";
  };
  readiness: WhatsAppReadiness;
  senders?: WhatsAppAuthorizedSenderItem[];
  telegramOperators?: TelegramAuthorizedOperatorItem[];
  role: "owner" | "admin" | "member";
}

function getStatusBadgeStyle(status: WhatsAppConnectionStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "READY":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "CONFIGURING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ERROR":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "NOT CONFIGURED":
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function getStatusDotColor(status: WhatsAppConnectionStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500";
    case "READY":
      return "bg-blue-500";
    case "CONFIGURING":
      return "bg-amber-500";
    case "ERROR":
      return "bg-rose-500";
    case "NOT CONFIGURED":
    default:
      return "bg-zinc-400";
  }
}

export function ChannelsView({
  settings,
  readiness,
  senders = [],
  telegramOperators = [],
  role,
}: ChannelsViewProps) {
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

  // Telegram Operators State (10.1I)
  const [telegramOps, setTelegramOps] = useState<TelegramAuthorizedOperatorItem[]>(telegramOperators);
  const [unlinkingOpId, setUnlinkingOpId] = useState<string | null>(null);
  const [unlinkOpMsg, setUnlinkOpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUnlinkTelegramOperator = async (operatorId: string) => {
    if (!canEdit) return;
    if (!confirm("Putuskan hubungan operator Telegram ini dari bisnis Anda? Akun ini tidak akan dapat mencatat transaksi lagi.")) return;

    setUnlinkingOpId(operatorId);
    setUnlinkOpMsg(null);
    try {
      const res = await unlinkTelegramOperatorAction(operatorId);
      if (res.success) {
        setTelegramOps((prev) => prev.filter((o) => o.id !== operatorId));
        setUnlinkOpMsg({ type: "success", text: "Operator Telegram berhasil diputuskan." });
      } else {
        setUnlinkOpMsg({ type: "error", text: res.error || "Gagal memutuskan operator." });
      }
    } catch {
      setUnlinkOpMsg({ type: "error", text: "Terjadi kesalahan saat memproses permintaan." });
    } finally {
      setUnlinkingOpId(null);
    }
  };

  // Cutover Modal State
  const [showCutoverModal, setShowCutoverModal] = useState(false);
  const [pendingCutoverPrimary, setPendingCutoverPrimary] = useState<"telegram" | "whatsapp" | null>(null);

  // Operator State
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newReceiveReminders, setNewReceiveReminders] = useState(true);
  const [addingOperator, setAddingOperator] = useState(false);
  const [operatorActionId, setOperatorActionId] = useState<string | null>(null);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [operatorSuccess, setOperatorSuccess] = useState<string | null>(null);

  // Template State
  const [templateName, setTemplateName] = useState(
    readiness.connection?.reminderTemplateName || "daily_sales_reminder"
  );
  const [templateLanguage, setTemplateLanguage] = useState(
    readiness.connection?.reminderTemplateLanguage || "id"
  );
  const [templateStatus, setTemplateStatus] = useState(
    readiness.connection?.reminderTemplateStatus || "unconfigured"
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);

  const canEdit = role === "owner" || role === "admin";

  const handleSaveSettings = async (overridePrimary?: "telegram" | "whatsapp") => {
    if (!canEdit) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const targetPrimary = overridePrimary || primaryChannel;

    try {
      const formData = new FormData();
      formData.set("telegramEnabled", String(telegramEnabled));
      formData.set("whatsappEnabled", String(whatsappEnabled));
      formData.set("primaryChannel", targetPrimary);
      formData.set("reminderChannel", reminderChannel);

      const res = await saveChannelSettingsAction(formData);
      if (res.success) {
        setSaveSuccess(true);
        if (overridePrimary) setPrimaryChannel(overridePrimary);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(res.error || "Gagal menyimpan pengaturan channel.");
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
      setShowCutoverModal(false);
      setPendingCutoverPrimary(null);
    }
  };

  const handlePrimaryChange = (val: "telegram" | "whatsapp") => {
    if (val === "whatsapp" && primaryChannel !== "whatsapp") {
      // Trigger confirmation modal for cutover to WhatsApp
      setPendingCutoverPrimary("whatsapp");
      setShowCutoverModal(true);
    } else {
      setPrimaryChannel(val);
    }
  };

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newPhone.trim()) return;

    setAddingOperator(true);
    setOperatorError(null);
    setOperatorSuccess(null);

    try {
      const formData = new FormData();
      formData.set("phoneNumber", newPhone.trim());
      formData.set("displayLabel", newLabel.trim());
      formData.set("receiveReminders", String(newReceiveReminders));

      const res = await addWhatsAppAuthorizedSenderAction(formData);
      if (res.success) {
        setOperatorSuccess("Operator WhatsApp berhasil didaftarkan.");
        setNewPhone("");
        setNewLabel("");
        setTimeout(() => setOperatorSuccess(null), 4000);
      } else {
        setOperatorError(res.error || "Gagal mendaftarkan operator.");
      }
    } catch (err: unknown) {
      setOperatorError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setAddingOperator(false);
    }
  };

  const handleToggleSenderActive = async (senderId: string, currentActive: boolean) => {
    if (!canEdit) return;
    setOperatorActionId(senderId);
    try {
      const res = await updateWhatsAppAuthorizedSenderAction(senderId, {
        active: !currentActive,
      });
      if (!res.success) {
        setOperatorError(res.error || "Gagal memperbarui status operator.");
      }
    } catch (err: unknown) {
      setOperatorError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setOperatorActionId(null);
    }
  };

  const handleToggleSenderReminders = async (senderId: string, currentReminders: boolean) => {
    if (!canEdit) return;
    setOperatorActionId(senderId);
    try {
      const res = await updateWhatsAppAuthorizedSenderAction(senderId, {
        receiveReminders: !currentReminders,
      });
      if (!res.success) {
        setOperatorError(res.error || "Gagal memperbarui status pengingat operator.");
      }
    } catch (err: unknown) {
      setOperatorError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setOperatorActionId(null);
    }
  };

  const handleDeleteSender = async (senderId: string) => {
    if (!canEdit) return;
    if (!confirm("Hapus nomor operator WhatsApp ini dari daftar izin bisnis?")) return;

    setOperatorActionId(senderId);
    try {
      const res = await deleteWhatsAppAuthorizedSenderAction(senderId);
      if (!res.success) {
        setOperatorError(res.error || "Gagal menghapus operator.");
      }
    } catch (err: unknown) {
      setOperatorError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setOperatorActionId(null);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSavingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);

    try {
      const formData = new FormData();
      formData.set("templateName", templateName.trim());
      formData.set("templateLanguage", templateLanguage.trim());
      formData.set("templateStatus", templateStatus);

      const res = await saveWhatsAppTemplateAction(formData);
      if (res.success) {
        setTemplateSuccess("Pengaturan template WhatsApp berhasil diperbarui.");
        setTimeout(() => setTemplateSuccess(null), 4000);
      } else {
        setTemplateError(res.error || "Gagal menyimpan template WhatsApp.");
      }
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="text-xs sm:text-sm font-medium">
            Pengaturan kanal komunikasi berhasil disimpan.
          </p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="text-xs sm:text-sm font-medium">{saveError}</p>
        </div>
      )}

      {/* WhatsApp Connection Health Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-zinc-900 text-sm">Status Integrasi WhatsApp Cloud API</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${getStatusBadgeStyle(
                    readiness.status
                  )}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(readiness.status)}`} />
                  {readiness.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Pondasi operasional pesan instan berbasis Meta Cloud API resmi (2026).
              </p>
            </div>
          </div>
        </div>

        {/* 6 Key Operational Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Nama Bisnis Meta</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 truncate" title={readiness.connection?.verifiedName || "Belum Diverifikasi"}>
              {readiness.connection?.verifiedName || "Belum Diverifikasi"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Nomor WhatsApp</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 font-mono">
              {readiness.connection?.maskedPhoneNumber || readiness.connection?.displayPhoneNumber || "Belum Didaftarkan"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Koneksi WABA ID</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 flex items-center gap-1">
              {readiness.hasWabaId ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>Terhubung</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400 inline" />
                  <span className="text-zinc-500">Belum Terdaftar</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Phone Number ID</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 font-mono">
              {readiness.connection?.maskedPhoneNumberId || "Belum Terdaftar"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Webhook Status</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 flex items-center gap-1">
              {readiness.hasActiveConnection ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                  <span>Aktif (HMAC)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 inline" />
                  <span className="text-amber-700">Verifikasi Tertunda</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Operator Terdaftar</p>
            <p className="text-xs font-semibold text-zinc-800 mt-1 flex items-center gap-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-zinc-200 text-zinc-700 font-bold text-[11px]">
                {readiness.authorizedSendersCount}
              </span>
              <span className="text-zinc-600">Nomor</span>
            </p>
          </div>
        </div>
      </div>

      {/* Channel Toggles Section */}
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
                  <p className="text-xs text-zinc-500">Kanal percontohan cepat & cadangan darurat</p>
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
                  Bot token dan webhook terkonfigurasi. Tetap dapat dipertahankan aktif berdampingan (dual-run) untuk keamanan operasional.
                </p>
              </div>

              {/* Connected Telegram Operators (10.1I) */}
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-800">Operator Telegram Terhubung</span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {telegramOps.length} aktif
                  </span>
                </div>

                {unlinkOpMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      unlinkOpMsg.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    <span>{unlinkOpMsg.text}</span>
                  </div>
                )}

                {telegramOps.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">
                    Belum ada akun Telegram yang terhubung. Hubungkan akun melalui kode pairing di halaman Onboarding.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {telegramOps.map((op) => (
                      <div
                        key={op.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-800 truncate">
                            {op.displayLabel || `Operator ID: ${op.telegramUserId}`}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            ID: {op.telegramUserId}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleUnlinkTelegramOperator(op.id)}
                            disabled={unlinkingOpId === op.id}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
                          >
                            {unlinkingOpId === op.id ? "Memutuskan..." : "Putuskan"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-100">
            Dapat berfungsi sebagai jalur cadangan (emergency fallback) saat migrasi WhatsApp.
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
                  <p className="text-xs text-zinc-500">Kanal utama komunikasi WhatsApp resmi</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  readiness.ready
                    ? whatsappEnabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    readiness.ready
                      ? whatsappEnabled
                        ? "bg-emerald-500"
                        : "bg-blue-500"
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
                    <span className={readiness.hasActiveConnection ? "text-zinc-700" : "text-zinc-500"}>
                      Koneksi WhatsApp Aktif
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {readiness.hasPhoneNumberId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={readiness.hasPhoneNumberId ? "text-zinc-700" : "text-zinc-500"}>
                      Phone Number ID Terdaftar
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {readiness.hasAuthorizedSenders ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={readiness.hasAuthorizedSenders ? "text-zinc-700" : "text-zinc-500"}>
                      Minimal 1 Operator WhatsApp Terdaftar ({readiness.authorizedSendersCount} terdaftar)
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {readiness.isTokenConfigured ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span className={readiness.isTokenConfigured ? "text-zinc-700" : "text-zinc-500"}>
                      Token WHATSAPP_ACCESS_TOKEN Runtime Siap
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
            Tentukan prioritas kanal komunikasi utama dan target pengingat otomatis bisnis Anda.
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
              onChange={(e) => handlePrimaryChange(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="telegram">Telegram (Aktif)</option>
              <option value="whatsapp" disabled={!readiness.ready}>
                WhatsApp {!readiness.ready ? "(Belum Siap - Lengkapi Checklist)" : "(Kanal Produksi)"}
              </option>
            </select>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Kanal acuan utama untuk pencatatan transaksi sehari-hari pemilik dan kasir.
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
              <option
                value="whatsapp"
                disabled={!readiness.hasApprovedTemplate || !readiness.ready}
              >
                WhatsApp {readiness.hasApprovedTemplate ? "(Template Disetujui)" : "(Terkunci — Butuh Template Disetujui)"}
              </option>
            </select>
            <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60">
              {readiness.hasApprovedTemplate ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              )}
              <span>
                {readiness.hasApprovedTemplate
                  ? `Template Meta "${readiness.connection?.reminderTemplateName}" telah disetujui. Pengingat WhatsApp siap dikirim ke operator terpilih.`
                  : "Pengingat WhatsApp diblokir demi kepatuhan Meta Policy sampai template berstatus approved dan operator terpilih terdaftar."}
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

        {/* Save Routing Button */}
        {canEdit && (
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors shadow-xs disabled:opacity-50"
            >
              <Radio className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan Pengaturan Kanal"}
            </button>
          </div>
        )}
      </div>

      {/* Operator WhatsApp Management Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-zinc-900 text-sm">Daftar Operator WhatsApp yang Diizinkan</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Hanya nomor terdaftar yang dapat mencatat transaksi penjualan dan menerima pengingat harian.
            </p>
          </div>
        </div>

        {operatorSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{operatorSuccess}</span>
          </div>
        )}

        {operatorError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{operatorError}</span>
          </div>
        )}

        {/* Add Operator Form */}
        {canEdit && (
          <form onSubmit={handleAddOperator} className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-4">
            <p className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              Tambah Operator WhatsApp Baru
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                  Nomor WhatsApp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="08123456789 atau 62812..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                  Nama / Label Jabatan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kasir Kolam 1 / Owner"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 h-9 mb-0.5">
                  <input
                    type="checkbox"
                    id="receiveRemindersCheckbox"
                    checked={newReceiveReminders}
                    onChange={(e) => setNewReceiveReminders(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <label htmlFor="receiveRemindersCheckbox" className="text-xs text-zinc-700 select-none">
                    Kirim pengingat otomatis ke nomor ini
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={addingOperator || !newPhone.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {addingOperator ? "Mendaftarkan..." : "Daftarkan Operator"}
              </button>
            </div>
          </form>
        )}

        {/* Operators List */}
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-medium">
              <tr>
                <th className="px-4 py-3">Nomor WhatsApp</th>
                <th className="px-4 py-3">Label / Nama</th>
                <th className="px-4 py-3 text-center">Status Akses</th>
                <th className="px-4 py-3 text-center">Terima Pengingat</th>
                {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {senders.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-zinc-400">
                    Belum ada operator WhatsApp yang terdaftar. Tambahkan operator di atas.
                  </td>
                </tr>
              ) : (
                senders.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-mono text-zinc-800">
                      {s.phoneNumber.slice(0, 5)}****{s.phoneNumber.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {s.displayLabel || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSenderActive(s.id, s.active)}
                        disabled={!canEdit || operatorActionId === s.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          s.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.active ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        {s.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSenderReminders(s.id, s.receiveReminders)}
                        disabled={!canEdit || operatorActionId === s.id}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                          s.receiveReminders
                            ? "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
                            : "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200"
                        }`}
                      >
                        <Bell className={`w-3 h-3 ${s.receiveReminders ? "text-sky-600" : "text-zinc-400"}`} />
                        {s.receiveReminders ? "Ya" : "Tidak"}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSender(s.id)}
                          disabled={operatorActionId === s.id}
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus Operator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Template Configuration Section */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6 shadow-xs space-y-6">
        <div>
          <h3 className="font-semibold text-zinc-900 text-sm flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-emerald-600" />
            Konfigurasi Template Pengingat Meta (Utility Template)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Sesuai aturan Meta Cloud API (2026), pengingat otomatis di luar jendela layanan 24 jam wajib menggunakan template kategori Utility yang telah disetujui Meta.
          </p>
        </div>

        {templateSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{templateSuccess}</span>
          </div>
        )}

        {templateError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{templateError}</span>
          </div>
        )}

        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Nama Template Meta
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={!canEdit}
                placeholder="daily_sales_reminder"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-mono text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Nama template di Meta WhatsApp Manager.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Kode Bahasa
              </label>
              <select
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="id">Bahasa Indonesia (id)</option>
                <option value="en_US">English (en_US)</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">Bahasa yang didaftarkan pada template.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                Status Persetujuan Meta
              </label>
              <select
                value={templateStatus}
                onChange={(e) => setTemplateStatus(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="unconfigured">Belum Dikonfigurasi (unconfigured)</option>
                <option value="pending">Sedang Ditinjau Meta (pending)</option>
                <option value="approved">Disetujui Meta (approved)</option>
                <option value="rejected">Ditolak Meta (rejected)</option>
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">Hanya template approved yang dapat digunakan.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">Ketentuan Pengiriman Pesan Bisnis WhatsApp:</p>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Pesan balasan transaksi yang dikirimkan dalam 24 jam setelah pesan operator masuk dapat menggunakan format teks biasa gratis.
                Namun untuk pengingat harian otomatis pada jam terjadwal, Meta membatasi pesan keluar wajib menggunakan template Utility yang telah disetujui.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingTemplate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors shadow-xs disabled:opacity-50"
              >
                <FileCode2 className="w-4 h-4" />
                {savingTemplate ? "Menyimpan Template..." : "Simpan Konfigurasi Template"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Cutover Confirmation Modal */}
      {showCutoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">
                  Konfirmasi Pengalihan Kanal Utama ke WhatsApp
                </h3>
                <p className="text-xs text-zinc-500">Migrasi Pilot Telegram ke WhatsApp Produksi</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 space-y-2">
              <p className="font-semibold text-emerald-900">Jaminan Integritas Buku Besar:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800/90">
                <li>Seluruh transaksi keuangan, katalog produk, dan laporan tetap tersimpan utuh di PostgreSQL.</li>
                <li>Kanal Telegram tetap dapat dipertahankan aktif sebagai jalur cadangan (dual-run).</li>
                <li>Pengalihan kanal murni mengubah jalur transport pesan tanpa menyentuh data keuangan.</li>
              </ul>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Jadikan WhatsApp sebagai kanal utama bisnis Anda sekarang?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCutoverModal(false);
                  setPendingCutoverPrimary(null);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(pendingCutoverPrimary || "whatsapp")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saving ? "Mengalihkan..." : "Ya, Alihkan ke WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
