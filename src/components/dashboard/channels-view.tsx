"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Radio,
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
  Bot,
  Plus,
  Users,
} from "lucide-react";
import {
  saveChannelSettingsAction,
  addWhatsAppAuthorizedSenderAction,
  updateWhatsAppAuthorizedSenderAction,
  deleteWhatsAppAuthorizedSenderAction,
  saveWhatsAppTemplateAction,
  unlinkTelegramOperatorAction,
  generateTelegramPairingCodeAction,
  checkTelegramPairingStatusAction,
} from "@/app/dashboard/actions";
import { WhatsAppReadiness, WhatsAppConnectionStatus } from "@/modules/channels/types";
import { TelegramPairingModal } from "@/components/telegram/telegram-pairing-modal";
import { getTelegramBotUsername } from "@/config/env.client";

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
  telegramUsername?: string | null;
  operatorRole?: string | null;
  active: boolean;
  receiveReminders?: boolean;
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
  plan?: {
    code: string;
    name: string;
    maxOperators: number;
  };
  botUsername?: string;
}

function getStatusBadgeStyle(status: WhatsAppConnectionStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "READY":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "CONFIGURING":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "ERROR":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "NOT CONFIGURED":
    default:
      return "bg-white/5 text-zinc-400 border-white/10";
  }
}

function getStatusDotColor(status: WhatsAppConnectionStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-400";
    case "READY":
      return "bg-sky-400";
    case "CONFIGURING":
      return "bg-amber-400";
    case "ERROR":
      return "bg-rose-400";
    case "NOT CONFIGURED":
    default:
      return "bg-zinc-500";
  }
}

export function ChannelsView({
  settings,
  readiness,
  senders = [],
  telegramOperators = [],
  role,
  plan,
  botUsername,
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

  // Telegram Operators State (10.2.1)
  const [telegramOps, setTelegramOps] = useState<TelegramAuthorizedOperatorItem[]>(telegramOperators);
  const [unlinkingOpId, setUnlinkingOpId] = useState<string | null>(null);
  const [unlinkOpMsg, setUnlinkOpMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [showPairingModal, setShowPairingModal] = useState(false);
  const [operatorToUnlink, setOperatorToUnlink] = useState<TelegramAuthorizedOperatorItem | null>(null);

  const effectiveBotUsername = botUsername || getTelegramBotUsername();
  const maxOperators = plan?.maxOperators ?? 2;
  const isLimitReached = telegramOps.length >= maxOperators;

  const maskTelegramUserId = (id: number | string): string => {
    const str = String(id);
    if (str.length <= 4) return `ID: ${str}`;
    return `ID: ******${str.slice(-4)}`;
  };

  const formatConnectedAt = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmUnlink = async () => {
    if (!canEdit || !operatorToUnlink) return;

    setUnlinkingOpId(operatorToUnlink.id);
    setUnlinkOpMsg(null);
    try {
      const res = await unlinkTelegramOperatorAction(operatorToUnlink.id);
      if (res.success) {
        setTelegramOps((prev) => prev.filter((o) => o.id !== operatorToUnlink.id));
        setUnlinkOpMsg({ type: "success", text: "Operator Telegram berhasil diputuskan." });
        setOperatorToUnlink(null);
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
      {/* Top 4 Summary Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Kanal Utama Aktif */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Kanal Utama
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">
            {primaryChannel === "telegram" ? "Telegram Bot" : "WhatsApp"}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Operasional Aktif
          </div>
        </div>

        {/* Metric 2: Kanal Sekunder */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Kanal Cadangan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white">
            Meta WhatsApp
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {whatsappEnabled ? "Aktif" : "Nonaktif (Deferred)"}
          </div>
        </div>

        {/* Metric 3: Operator Telegram */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Operator Terhubung
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {telegramOps.length}
            </span>
            <span className="text-xs text-zinc-400">/ {maxOperators} Kuota</span>
          </div>
          <div className="mt-2 text-[11px] text-sky-400">
            {plan?.name || "Paket Bisnis"}
          </div>
        </div>

        {/* Metric 4: Pengingat Harian */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Pengingat Harian
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-white capitalize">
            {reminderChannel}
          </div>
          <div className="mt-2 text-[11px] text-amber-300">
            Target perutean notifikasi
          </div>
        </div>
      </div>

      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs sm:text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>Pengaturan kanal komunikasi berhasil disimpan.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{saveError}</span>
        </div>
      )}

      {/* WhatsApp Connection Health Banner */}
      <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Status Integrasi WhatsApp Cloud API
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${getStatusBadgeStyle(
                    readiness.status
                  )}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${getStatusDotColor(readiness.status)}`} />
                  {readiness.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pondasi operasional pesan instan berbasis Meta Cloud API resmi.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Key Operational Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Nama Bisnis Meta</p>
            <p className="text-xs font-semibold text-white mt-1 truncate" title={readiness.connection?.verifiedName || "Belum Diverifikasi"}>
              {readiness.connection?.verifiedName || "Belum Diverifikasi"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Nomor WhatsApp</p>
            <p className="text-xs font-semibold text-white mt-1 font-mono">
              {readiness.connection?.maskedPhoneNumber || readiness.connection?.displayPhoneNumber || "Belum Ada"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Koneksi WABA ID</p>
            <p className="text-xs font-semibold text-white mt-1 flex items-center gap-1">
              {readiness.hasWabaId ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                  <span className="text-emerald-300">Terhubung</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-500 inline" />
                  <span className="text-zinc-400">Belum Ada</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Phone Number ID</p>
            <p className="text-xs font-semibold text-white mt-1 font-mono">
              {readiness.connection?.maskedPhoneNumberId || "Belum Ada"}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Webhook Status</p>
            <p className="text-xs font-semibold text-white mt-1 flex items-center gap-1">
              {readiness.hasActiveConnection ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                  <span className="text-emerald-300">Aktif (HMAC)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 inline" />
                  <span className="text-amber-300">Tertunda</span>
                </>
              )}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Operator Terdaftar</p>
            <p className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
              <span className="inline-block px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[11px] font-mono">
                {readiness.authorizedSendersCount}
              </span>
              <span className="text-zinc-300">Nomor</span>
            </p>
          </div>
        </div>
      </div>

      {/* Channel Toggles Section (2 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Card */}
        <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-5 transition-all hover:border-purple-500/30">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Telegram Bot</h3>
                  <p className="text-xs text-purple-300 font-mono mt-0.5">@{effectiveBotUsername}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  telegramEnabled
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/5 text-zinc-400 border border-white/10"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    telegramEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                  }`}
                />
                {telegramEnabled ? "AKTIF" : "NONAKTIF"}
              </span>
            </div>

            {/* Connection Status Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider">
                  Webhook
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Aktif & Terverifikasi
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] text-zinc-400 font-medium block uppercase tracking-wider">
                  Bot Status
                </span>
                <span className="font-semibold text-white flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Siap Melayani
                </span>
              </div>
            </div>

            {/* Toggle Channel */}
            <div className="flex items-center justify-between py-2 border-t border-b border-white/5">
              <div>
                <p className="text-xs font-semibold text-white">Aktifkan Perintah Bot</p>
                <p className="text-[11px] text-zinc-400">
                  Menerima perintah /sale, /batal, /status, dan pengingat via Telegram.
                </p>
              </div>
              <button
                type="button"
                onClick={() => canEdit && setTelegramEnabled(!telegramEnabled)}
                disabled={!canEdit}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                  telegramEnabled ? "bg-purple-600 shadow-md shadow-purple-900/40" : "bg-white/10"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                    telegramEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Operators Section */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white">Operator Telegram Terhubung</span>
                  <p className="text-[11px] text-zinc-400">
                    {plan?.name ? `${plan.name}: ` : ""}
                    {telegramOps.length} / {maxOperators} operator digunakan
                  </p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                    isLimitReached
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                  }`}
                >
                  {telegramOps.length} / {maxOperators}
                </span>
              </div>

              {/* Status/Error banner */}
              {unlinkOpMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    unlinkOpMsg.type === "success"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  }`}
                >
                  <span>{unlinkOpMsg.text}</span>
                </div>
              )}

              {/* Limit Reached Warning */}
              {isLimitReached && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">Batas operator tercapai</p>
                    <p className="text-[11px] text-zinc-400">
                      Batas operator Telegram untuk paket Anda sudah tercapai ({telegramOps.length}/{maxOperators}).
                    </p>
                  </div>
                  <Link
                    href="/dashboard/subscription"
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-medium text-[11px] shrink-0 transition"
                  >
                    Lihat Paket
                  </Link>
                </div>
              )}

              {/* Operator Cards / List */}
              {telegramOps.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
                  <p className="text-xs text-zinc-400">Belum ada operator Telegram yang terhubung.</p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setShowPairingModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all active:scale-[0.98]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Hubungkan Telegram</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {telegramOps.map((op) => (
                    <div
                      key={op.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2.5 transition-all hover:border-purple-500/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">
                              {op.operatorRole || op.displayLabel || "Operator"}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              Aktif
                            </span>
                          </div>
                          <p className="text-xs text-purple-300 font-mono mt-0.5">
                            {op.telegramUsername ? `@${op.telegramUsername.replace(/^@/, "")}` : maskTelegramUserId(op.telegramUserId)}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setOperatorToUnlink(op)}
                            disabled={unlinkingOpId === op.id}
                            className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition disabled:opacity-50"
                          >
                            Putuskan
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-zinc-400">
                        <div>
                          <span>Terima Pengingat: </span>
                          <span className="font-medium text-white">
                            {op.receiveReminders ? "Ya" : "Tidak"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span>Terhubung: </span>
                          <span className="font-medium text-white">
                            {formatConnectedAt(op.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Operator CTA */}
                  {canEdit && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPairingModal(true)}
                        disabled={isLimitReached}
                        className="w-full py-2.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4 text-purple-400" />
                        <span>+ Tambah Operator Telegram</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="text-[11px] text-zinc-400 pt-3 border-t border-white/5 leading-relaxed">
            Gunakan satu bot OXID Ledger untuk semua bisnis. Setiap operator dihubungkan melalui kode koneksi yang unik.
          </div>
        </div>

        {/* WhatsApp Card */}
        <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Meta WhatsApp Cloud API</h3>
                  <p className="text-xs text-zinc-400">Kanal utama komunikasi WhatsApp resmi</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  readiness.ready
                    ? whatsappEnabled
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                    : "bg-white/5 text-zinc-400 border border-white/10"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    readiness.ready
                      ? whatsappEnabled
                        ? "bg-emerald-400"
                        : "bg-sky-400"
                      : "bg-zinc-500"
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
                  <p className="text-xs font-semibold text-white">Aktifkan Kanal WhatsApp</p>
                  <p className="text-[11px] text-zinc-400">
                    Memproses webhook pesan masuk dan mengirim balasan via WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!readiness.ready && !whatsappEnabled) {
                      setSaveError(
                        `Kanal WhatsApp belum dapat diaktifkan: ${readiness.missingRequirements.join(" ")}`
                      );
                      return;
                    }
                    if (canEdit) setWhatsappEnabled(!whatsappEnabled);
                  }}
                  disabled={!canEdit || (!readiness.ready && !whatsappEnabled)}
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
                    whatsappEnabled ? "bg-emerald-600 shadow-md shadow-emerald-900/40" : "bg-white/10"
                  } disabled:opacity-50`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                      whatsappEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Readiness Checklist */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Checklist Kesiapan WhatsApp
                </p>
                <ul className="text-xs space-y-2">
                  <li className="flex items-center gap-2.5">
                    {readiness.hasActiveConnection ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={readiness.hasActiveConnection ? "text-zinc-200" : "text-zinc-400"}>
                      Koneksi WhatsApp Aktif
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    {readiness.hasPhoneNumberId ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={readiness.hasPhoneNumberId ? "text-zinc-200" : "text-zinc-400"}>
                      Phone Number ID Terdaftar
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    {readiness.hasAuthorizedSenders ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={readiness.hasAuthorizedSenders ? "text-zinc-200" : "text-zinc-400"}>
                      Minimal 1 Operator WhatsApp Terdaftar ({readiness.authorizedSendersCount} terdaftar)
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    {readiness.isTokenConfigured ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className={readiness.isTokenConfigured ? "text-zinc-200" : "text-zinc-400"}>
                      Token WHATSAPP_ACCESS_TOKEN Runtime Siap
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-white/5 leading-relaxed">
            Membutuhkan Meta WABA terverifikasi dan App subscription resmi.
          </div>
        </div>
      </div>

      {/* Channel Routing Configuration Card */}
      <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base">
            Perutean Kanal (Routing)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Tentukan prioritas kanal komunikasi utama dan target pengingat otomatis bisnis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Channel */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
              Kanal Utama (Primary Channel)
            </label>
            <select
              value={primaryChannel}
              onChange={(e) => handlePrimaryChange(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="telegram" className="bg-[#111726] text-white">Telegram (Aktif & Teruji)</option>
              <option value="whatsapp" disabled={!readiness.ready} className="bg-[#111726] text-white">
                WhatsApp {!readiness.ready ? "(Belum Siap - Lengkapi Checklist)" : "(Kanal Produksi)"}
              </option>
            </select>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Kanal acuan utama untuk pencatatan transaksi sehari-hari pemilik dan kasir.
            </p>
          </div>

          {/* Reminder Channel */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2">
              Kanal Pengingat Otomatis (Reminder Channel)
            </label>
            <select
              value={reminderChannel}
              onChange={(e) => setReminderChannel(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            >
              <option value="telegram" className="bg-[#111726] text-white">Telegram (Aktif & Teruji)</option>
              <option
                value="whatsapp"
                disabled={!readiness.hasApprovedTemplate || !readiness.ready}
                className="bg-[#111726] text-white"
              >
                WhatsApp {readiness.hasApprovedTemplate ? "(Template Disetujui)" : "(Terkunci — Butuh Template Disetujui)"}
              </option>
            </select>
            <div className="mt-2 flex items-start gap-2 text-[11px] text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5 leading-relaxed">
              {readiness.hasApprovedTemplate ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
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
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 flex items-start gap-3">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">Jaminan Keamanan Data & Sumber Kebenaran</p>
            <p className="text-[11px] leading-relaxed text-zinc-400">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
            >
              <Radio className="w-4 h-4" />
              <span>{saving ? "Menyimpan..." : "Simpan Pengaturan Kanal"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Operator WhatsApp Management Section */}
      <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base">
            Daftar Operator WhatsApp yang Diizinkan
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Hanya nomor terdaftar yang dapat mencatat transaksi penjualan dan menerima pengingat harian.
          </p>
        </div>

        {operatorSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{operatorSuccess}</span>
          </div>
        )}

        {operatorError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{operatorError}</span>
          </div>
        )}

        {/* Add Operator Form */}
        {canEdit && (
          <form onSubmit={handleAddOperator} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <p className="text-xs font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              Tambah Operator WhatsApp Baru
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Nomor WhatsApp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="08123456789 atau 62812..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 text-xs text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                  Nama / Label Jabatan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kasir Kolam 1 / Owner"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 text-xs text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 h-9 mb-0.5">
                  <input
                    type="checkbox"
                    id="receiveRemindersCheckbox"
                    checked={newReceiveReminders}
                    onChange={(e) => setNewReceiveReminders(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-0 h-4 w-4"
                  />
                  <label htmlFor="receiveRemindersCheckbox" className="text-xs text-zinc-300 select-none">
                    Kirim pengingat ke nomor ini
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={addingOperator || !newPhone.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{addingOperator ? "Mendaftarkan..." : "Daftarkan Operator"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Operators Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/10 text-zinc-400 font-semibold uppercase text-[11px]">
              <tr>
                <th className="px-4 py-3">Nomor WhatsApp</th>
                <th className="px-4 py-3">Label / Nama</th>
                <th className="px-4 py-3 text-center">Status Akses</th>
                <th className="px-4 py-3 text-center">Terima Pengingat</th>
                {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {senders.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-zinc-500">
                    Belum ada operator WhatsApp yang terdaftar. Tambahkan operator di atas.
                  </td>
                </tr>
              ) : (
                senders.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-white">
                      {s.phoneNumber.slice(0, 5)}****{s.phoneNumber.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {s.displayLabel || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSenderActive(s.id, s.active)}
                        disabled={!canEdit || operatorActionId === s.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
                          s.active
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.active ? "bg-emerald-400" : "bg-zinc-500"}`} />
                        {s.active ? "Aktif" : "Nonaktif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSenderReminders(s.id, s.receiveReminders)}
                        disabled={!canEdit || operatorActionId === s.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition ${
                          s.receiveReminders
                            ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                            : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}
                      >
                        <Bell className={`w-3 h-3 ${s.receiveReminders ? "text-sky-400" : "text-zinc-500"}`} />
                        {s.receiveReminders ? "Ya" : "Tidak"}
                      </button>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSender(s.id)}
                          disabled={operatorActionId === s.id}
                          className="p-1 text-zinc-400 hover:text-rose-400 transition"
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
      <div className="bg-[#111726]/80 rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-purple-400" />
            Konfigurasi Template Pengingat Meta (Utility Template)
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Sesuai aturan Meta Cloud API, pengingat otomatis di luar jendela layanan 24 jam wajib menggunakan template kategori Utility yang telah disetujui Meta.
          </p>
        </div>

        {templateSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{templateSuccess}</span>
          </div>
        )}

        {templateError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{templateError}</span>
          </div>
        )}

        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Nama Template Meta
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={!canEdit}
                placeholder="daily_sales_reminder"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-mono text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">Nama template di Meta WhatsApp Manager.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Kode Bahasa
              </label>
              <select
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-xs text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="id" className="bg-[#111726] text-white">Bahasa Indonesia (id)</option>
                <option value="en_US" className="bg-[#111726] text-white">English (en_US)</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Bahasa yang didaftarkan pada template.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Status Persetujuan Meta
              </label>
              <select
                value={templateStatus}
                onChange={(e) => setTemplateStatus(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-white bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="unconfigured" className="bg-[#111726] text-white">Belum Dikonfigurasi (unconfigured)</option>
                <option value="pending" className="bg-[#111726] text-white">Sedang Ditinjau Meta (pending)</option>
                <option value="approved" className="bg-[#111726] text-white">Disetujui Meta (approved)</option>
                <option value="rejected" className="bg-[#111726] text-white">Ditolak Meta (rejected)</option>
              </select>
              <p className="text-[11px] text-zinc-500 mt-1">Hanya template approved yang dapat digunakan.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Ketentuan Pengiriman Pesan Bisnis WhatsApp:</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition shadow-xs disabled:opacity-50"
              >
                <FileCode2 className="w-4 h-4" />
                <span>{savingTemplate ? "Menyimpan Template..." : "Simpan Konfigurasi Template"}</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Cutover Confirmation Modal */}
      {showCutoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111726] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">
                  Konfirmasi Pengalihan Kanal Utama ke WhatsApp
                </h3>
                <p className="text-xs text-zinc-400">Migrasi Telegram ke WhatsApp Produksi</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-zinc-300 space-y-2">
              <p className="font-semibold text-white">Jaminan Integritas Buku Besar:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                <li>Seluruh transaksi keuangan, katalog produk, dan laporan tetap tersimpan utuh di PostgreSQL.</li>
                <li>Kanal Telegram tetap dapat dipertahankan aktif sebagai jalur cadangan (dual-run).</li>
                <li>Pengalihan kanal murni mengubah jalur transport pesan tanpa menyentuh data keuangan.</li>
              </ul>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
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
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(pendingCutoverPrimary || "whatsapp")}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saving ? "Mengalihkan..." : "Ya, Alihkan ke WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Operator Unlink Confirmation Modal */}
      {operatorToUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#111726] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-4 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Putuskan operator Telegram?</h3>
                <p className="text-xs text-zinc-400">
                  {operatorToUnlink.operatorRole || operatorToUnlink.displayLabel || "Operator"} &bull;{" "}
                  {operatorToUnlink.telegramUsername
                    ? `@${operatorToUnlink.telegramUsername.replace(/^@/, "")}`
                    : maskTelegramUserId(operatorToUnlink.telegramUserId)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 space-y-1">
              <p className="font-semibold text-white">Perhatian:</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Operator ini tidak akan bisa lagi mencatat transaksi melalui Telegram untuk bisnis ini.
              </p>
            </div>

            {/* Lockout Warning if single operator */}
            {telegramOps.length === 1 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ini adalah satu-satunya operator Telegram yang terhubung.</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Setelah diputuskan, transaksi melalui Telegram tidak dapat dilakukan sampai operator baru dihubungkan.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOperatorToUnlink(null)}
                disabled={unlinkingOpId !== null}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition min-h-[44px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={unlinkingOpId !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-900/30 disabled:opacity-50 min-h-[44px]"
              >
                {unlinkingOpId !== null ? "Memutuskan..." : "Putuskan Operator"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Telegram Pairing Modal */}
      <TelegramPairingModal
        isOpen={showPairingModal}
        onClose={() => setShowPairingModal(false)}
        generateToken={async () => {
          const res = await generateTelegramPairingCodeAction();
          return {
            success: res.success,
            result: res.result || res.data,
            data: res.data || res.result,
            error: res.error,
          };
        }}
        checkStatus={async (code) => {
          const res = await checkTelegramPairingStatusAction(code);
          if (res.paired && res.operators) {
            setTelegramOps(res.operators);
          }
          return {
            success: res.success,
            paired: res.paired,
            error: res.error,
          };
        }}
        onSuccess={() => {
          checkTelegramPairingStatusAction().then((res) => {
            if (res.success && res.operators) {
              setTelegramOps(res.operators);
            }
          });
        }}
      />
    </div>
  );
}
