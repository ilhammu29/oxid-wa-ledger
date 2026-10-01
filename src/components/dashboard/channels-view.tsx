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
import { WhatsAppReadiness } from "@/modules/channels/types";
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

  // WhatsApp Operator & Template State
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newReceiveReminders, setNewReceiveReminders] = useState(true);
  const [addingOperator, setAddingOperator] = useState(false);
  const [operatorActionId, setOperatorActionId] = useState<string | null>(null);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [operatorSuccess, setOperatorSuccess] = useState<string | null>(null);

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
        setSaveError(res.error || "Gagal menyimpan pengaturan kanal.");
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
      formData.set("templateName", templateName);
      formData.set("templateLanguage", templateLanguage);
      formData.set("templateStatus", templateStatus);

      const res = await saveWhatsAppTemplateAction(formData);
      if (res.success) {
        setTemplateSuccess("Konfigurasi template Meta berhasil disimpan.");
        setTimeout(() => setTemplateSuccess(null), 4000);
      } else {
        setTemplateError(res.error || "Gagal menyimpan template.");
      }
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Inline Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Kanal Perpesanan
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Kelola koneksi bot Telegram, alokasi operator, dan perutean pengingat otomatis.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 text-xs text-muted bg-surface border border-border px-3 py-1.5 rounded-lg self-start sm:self-auto">
          <span>Kanal Aktif: <strong className="text-foreground capitalize">{primaryChannel}</strong></span>
          <span className="text-border">·</span>
          <span>Operator: <strong className="text-foreground font-mono">{telegramOps.length}</strong> / {maxOperators}</span>
        </div>
      </div>

      {/* Alert Notices */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>Pengaturan kanal komunikasi berhasil disimpan.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Channel Cards (2 Distinct Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Telegram Card (Primary Operational Channel) */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm">Telegram Bot</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                      Kanal Utama
                    </span>
                  </div>
                  <p className="text-xs text-muted font-mono mt-0.5">@{effectiveBotUsername}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                    telegramEnabled
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      : "bg-secondary text-muted-foreground border border-border"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      telegramEnabled ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  {telegramEnabled ? "Aktif" : "Nonaktif"}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setTelegramEnabled(!telegramEnabled)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                      telegramEnabled ? "bg-primary" : "bg-secondary border border-border"
                    }`}
                    aria-label="Aktifkan Telegram"
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        telegramEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-md bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted uppercase font-medium block">
                  Webhook Bot
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Operasional
                </span>
              </div>
              <div className="p-2.5 rounded-md bg-secondary/50 border border-border">
                <span className="text-[10px] text-muted uppercase font-medium block">
                  Status Layanan
                </span>
                <span className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Siap Melayani
                </span>
              </div>
            </div>

            {/* Operator Quota Header */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted" />
                  Operator Telegram Terhubung
                </span>
                <p className="text-[11px] text-muted">
                  {plan?.name ? `${plan.name}: ` : ""}
                  {telegramOps.length} dari {maxOperators} kuota digunakan
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                  isLimitReached
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-secondary text-foreground border border-border"
                }`}
              >
                {telegramOps.length} / {maxOperators}
              </span>
            </div>

            {/* Unlink Message Banner */}
            {unlinkOpMsg && (
              <div
                className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${
                  unlinkOpMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                }`}
              >
                <span>{unlinkOpMsg.text}</span>
              </div>
            )}

            {/* Limit Warning */}
            {isLimitReached && (
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-medium">Batas operator tercapai</p>
                  <p className="text-[11px] text-muted">
                    Tingkatkan paket bisnis untuk menghubungkan lebih banyak operator.
                  </p>
                </div>
                <Link
                  href="/dashboard/subscription"
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium shrink-0 transition"
                >
                  Upgrade
                </Link>
              </div>
            )}

            {/* Operator List */}
            {telegramOps.length === 0 ? (
              <div className="p-5 rounded-lg border border-dashed border-border text-center space-y-2.5">
                <p className="text-xs text-muted">Belum ada operator Telegram yang terhubung.</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowPairingModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Hubungkan Operator</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {telegramOps.map((op) => (
                  <div
                    key={op.id}
                    className="p-3 rounded-lg border border-border bg-secondary/30 text-xs space-y-1.5 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground text-xs">
                            {op.operatorRole || op.displayLabel || "Operator"}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            Aktif
                          </span>
                        </div>
                        <p className="text-[11px] text-muted font-mono mt-0.5">
                          {op.telegramUsername ? `@${op.telegramUsername.replace(/^@/, "")}` : maskTelegramUserId(op.telegramUserId)}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setOperatorToUnlink(op)}
                          disabled={unlinkingOpId === op.id}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition disabled:opacity-50"
                        >
                          Putuskan
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border text-[11px] text-muted">
                      <span>Pengingat: <strong className="text-foreground">{op.receiveReminders ? "Ya" : "Tidak"}</strong></span>
                      <span>Terhubung: {formatConnectedAt(op.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {/* Add Operator CTA */}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowPairingModal(true)}
                    disabled={isLimitReached}
                    className="w-full py-2 px-3 rounded-lg border border-border hover:bg-surface-hover text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>+ Hubungkan Operator Telegram</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted pt-2 border-t border-border">
            Satu bot OXID Ledger melayani semua bisnis. Operator dihubungkan menggunakan kode aman yang kedaluwarsa dalam 10 menit.
          </p>
        </div>

        {/* WhatsApp Card (Clean Deferred State) */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Meta WhatsApp Cloud API</h3>
                  <p className="text-xs text-muted">Kanal Perpesanan Bisnis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
                  {whatsappEnabled ? "Aktif" : "Segera Hadir"}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!readiness.ready && !whatsappEnabled) {
                        setSaveError(
                          `Kanal WhatsApp belum dapat diaktifkan: ${readiness.missingRequirements.join(" ")}`
                        );
                        return;
                      }
                      setWhatsappEnabled(!whatsappEnabled);
                    }}
                    disabled={!readiness.ready && !whatsappEnabled}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none shrink-0 ${
                      whatsappEnabled ? "bg-primary" : "bg-secondary border border-border"
                    } disabled:opacity-50`}
                    aria-label="Aktifkan WhatsApp"
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        whatsappEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Explanation Box */}
            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-medium">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <span>Status Peluncuran WhatsApp Cloud</span>
              </div>
              <p className="text-muted leading-relaxed text-[11px]">
                Integrasi langsung Meta WhatsApp Cloud API sedang dalam tahap sertifikasi template utility dan verifikasi WABA bisnis. Selama fase pra-beta ini, seluruh pencatatan transaksi kasir difokuskan melalui kanal resmi Telegram Bot yang stabil dan terbukti cepat.
              </p>
            </div>

            {/* Readiness Checklist (Compact) */}
            <div className="p-3 rounded-lg border border-border space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted">
                Status Kesiapan Meta WABA
              </p>
              <ul className="text-xs space-y-1.5">
                <li className="flex items-center gap-2">
                  {readiness.hasActiveConnection ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[10px] text-muted">-</span>
                  )}
                  <span className={readiness.hasActiveConnection ? "text-foreground" : "text-muted"}>
                    Koneksi WhatsApp Aktif
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {readiness.hasPhoneNumberId ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[10px] text-muted">-</span>
                  )}
                  <span className={readiness.hasPhoneNumberId ? "text-foreground" : "text-muted"}>
                    Phone Number ID Terdaftar
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {readiness.hasApprovedTemplate ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center text-[10px] text-muted">-</span>
                  )}
                  <span className={readiness.hasApprovedTemplate ? "text-foreground" : "text-muted"}>
                    Template Utilitas Meta Disetujui
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-muted pt-2 border-t border-border">
            Ketika siap, aktivasi kanal WhatsApp tidak akan mengubah riwayat keuangan yang telah tercatat di PostgreSQL.
          </p>
        </div>
      </div>

      {/* Channel Routing & Preferences Card */}
      <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground text-sm">
            Perutean Kanal (Routing)
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Tentukan prioritas kanal komunikasi utama dan target pengingat otomatis bisnis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Channel */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kanal Utama (Primary Channel)
            </label>
            <select
              value={primaryChannel}
              onChange={(e) => handlePrimaryChange(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary transition"
            >
              <option value="telegram">Telegram (Utama - Stabil & Teruji)</option>
              <option value="whatsapp" disabled={!readiness.ready}>
                WhatsApp {!readiness.ready ? "(Belum Siap - Ditangguhkan)" : "(Kanal Produksi)"}
              </option>
            </select>
            <p className="text-[11px] text-muted mt-1">
              Kanal acuan untuk pencatatan transaksi sehari-hari pemilik dan kasir.
            </p>
          </div>

          {/* Reminder Channel */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kanal Pengingat Otomatis (Reminder Channel)
            </label>
            <select
              value={reminderChannel}
              onChange={(e) => setReminderChannel(e.target.value as "telegram" | "whatsapp")}
              disabled={!canEdit}
              className="w-full px-3 py-2 rounded-lg border border-border text-xs text-foreground bg-background focus:outline-none focus:ring-1 focus:ring-primary transition"
            >
              <option value="telegram">Telegram (Utama - Stabil & Teruji)</option>
              <option
                value="whatsapp"
                disabled={!readiness.hasApprovedTemplate || !readiness.ready}
              >
                WhatsApp {readiness.hasApprovedTemplate ? "(Template Disetujui)" : "(Terkunci — Butuh Template Meta)"}
              </option>
            </select>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
              {readiness.hasApprovedTemplate ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Lock className="w-3.5 h-3.5 shrink-0 text-muted" />
              )}
              <span>
                {readiness.hasApprovedTemplate
                  ? "Template Meta siap digunakan untuk pengingat."
                  : "Pengingat WhatsApp dibatasi sampai template utility disetujui Meta."}
              </span>
            </div>
          </div>
        </div>

        {/* Save Routing Button */}
        {canEdit && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleSaveSettings()}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan Kanal"}
            </button>
          </div>
        )}
      </div>

      {/* Advanced / Developer Integration: WhatsApp Senders & Templates (Subtle Collapsible Section) */}
      <details className="card-base bg-surface border-border p-4 rounded-lg group">
        <summary className="text-xs font-medium text-muted cursor-pointer hover:text-foreground flex items-center justify-between select-none">
          <span>Konfigurasi Lanjutan WhatsApp Cloud API & Template</span>
          <span className="text-[11px] font-mono group-open:rotate-90 transition-transform">▸</span>
        </summary>

        <div className="pt-4 space-y-5 border-t border-border mt-3">
          {/* Operator WhatsApp Form & Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground">Operator WhatsApp yang Diizinkan</h4>
            {operatorSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                {operatorSuccess}
              </div>
            )}
            {operatorError && (
              <div className="p-2.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                {operatorError}
              </div>
            )}

            {canEdit && (
              <form onSubmit={handleAddOperator} className="p-3 rounded-lg bg-secondary/40 border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nomor WA (contoh: 08123...)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Label / Nama Operator"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background text-foreground"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="receiveRemindersCheckbox"
                      checked={newReceiveReminders}
                      onChange={(e) => setNewReceiveReminders(e.target.checked)}
                      className="rounded border-border text-primary"
                    />
                    <label htmlFor="receiveRemindersCheckbox" className="text-xs text-muted">
                      Kirim pengingat
                    </label>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingOperator || !newPhone.trim()}
                    className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-surface-hover border border-border text-foreground text-xs font-medium transition disabled:opacity-50"
                  >
                    {addingOperator ? "Mendaftarkan..." : "Daftarkan Operator"}
                  </button>
                </div>
              </form>
            )}

            {senders.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-secondary/50 text-muted uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Nomor</th>
                      <th className="px-3 py-2">Label</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Pengingat</th>
                      {canEdit && <th className="px-3 py-2 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {senders.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover">
                        <td className="px-3 py-2 font-mono text-foreground">{s.phoneNumber}</td>
                        <td className="px-3 py-2 text-muted">{s.displayLabel || "-"}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSenderActive(s.id, s.active)}
                            disabled={!canEdit || operatorActionId === s.id}
                            className="text-[11px] text-muted underline"
                          >
                            {s.active ? "Aktif" : "Nonaktif"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSenderReminders(s.id, s.receiveReminders)}
                            disabled={!canEdit || operatorActionId === s.id}
                            className="text-[11px] text-muted hover:text-foreground inline-flex items-center gap-1"
                          >
                            <Bell className={`w-3 h-3 ${s.receiveReminders ? "text-primary" : "text-muted"}`} />
                            <span>{s.receiveReminders ? "Ya" : "Tidak"}</span>
                          </button>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteSender(s.id)}
                              className="text-muted hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Template Configuration */}
          <div className="space-y-3 pt-3 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileCode2 className="w-3.5 h-3.5 text-muted" />
              Pengaturan Template Utilitas Meta
            </h4>
            {templateSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
                {templateSuccess}
              </div>
            )}
            {templateError && (
              <div className="p-2.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
                {templateError}
              </div>
            )}

            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Nama Template</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-1.5 rounded-lg border border-border text-xs font-mono bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Bahasa</label>
                  <select
                    value={templateLanguage}
                    onChange={(e) => setTemplateLanguage(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-1.5 rounded-lg border border-border text-xs bg-background text-foreground"
                  >
                    <option value="id">Bahasa Indonesia (id)</option>
                    <option value="en_US">English (en_US)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Status Persetujuan</label>
                  <select
                    value={templateStatus}
                    onChange={(e) => setTemplateStatus(e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-1.5 rounded-lg border border-border text-xs bg-background text-foreground"
                  >
                    <option value="unconfigured">unconfigured</option>
                    <option value="pending">pending</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-surface-hover border border-border text-foreground text-xs font-medium transition disabled:opacity-50"
                  >
                    {savingTemplate ? "Menyimpan..." : "Simpan Template"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </details>

      {/* Cutover Confirmation Modal */}
      {showCutoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card-base bg-surface border-border rounded-xl max-w-md w-full p-5 space-y-3.5 text-foreground shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Konfirmasi Pengalihan ke WhatsApp
                </h3>
                <p className="text-xs text-muted">Jadikan WhatsApp sebagai kanal utama</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted space-y-1">
              <p className="font-medium text-foreground">Jaminan Integritas Buku Besar:</p>
              <p className="text-[11px] leading-relaxed">
                Seluruh transaksi keuangan tetap tersimpan utuh di PostgreSQL Supabase. Pengalihan hanya memindahkan jalur pesan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCutoverModal(false);
                  setPendingCutoverPrimary(null);
                }}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveSettings(pendingCutoverPrimary || "whatsapp")}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition disabled:opacity-50"
              >
                {saving ? "Mengalihkan..." : "Ya, Alihkan ke WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Operator Unlink Confirmation Modal */}
      {operatorToUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="card-base bg-surface border-border rounded-xl max-w-md w-full p-5 space-y-3.5 text-foreground shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Putuskan Operator Telegram?</h3>
                <p className="text-xs text-muted">
                  {operatorToUnlink.operatorRole || operatorToUnlink.displayLabel || "Operator"} &bull;{" "}
                  {operatorToUnlink.telegramUsername
                    ? `@${operatorToUnlink.telegramUsername.replace(/^@/, "")}`
                    : maskTelegramUserId(operatorToUnlink.telegramUserId)}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted">
              Operator ini tidak akan bisa lagi mencatat transaksi melalui Telegram untuk bisnis ini sampai dihubungkan kembali.
            </div>

            {telegramOps.length === 1 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Ini adalah satu-satunya operator yang terhubung.</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setOperatorToUnlink(null)}
                disabled={unlinkingOpId !== null}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-foreground transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmUnlink}
                disabled={unlinkingOpId !== null}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
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
