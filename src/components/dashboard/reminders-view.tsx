"use client";

import { useState } from "react";
import {
  Bell,
  Clock,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
} from "lucide-react";
import {
  saveReminderSettingsAction,
  sendTestReminderAction,
} from "@/app/dashboard/actions";
import { REMINDER_MESSAGE_TEXT } from "@/modules/reminders/runner";

interface TelegramOperator {
  id: string;
  telegramUserId: number;
  displayLabel: string | null;
  receiveReminders: boolean;
}

interface RemindersViewProps {
  settings: {
    enabled: boolean;
    reminderTime: string;
    daysOfWeek: number[];
    channel: string;
    timezone: string;
  };
  operators: TelegramOperator[];
  role: "owner" | "admin" | "member";
}

const DAYS = [
  { id: 1, label: "Senin", short: "Sen" },
  { id: 2, label: "Selasa", short: "Sel" },
  { id: 3, label: "Rabu", short: "Rab" },
  { id: 4, label: "Kamis", short: "Kam" },
  { id: 5, label: "Jumat", short: "Jum" },
  { id: 6, label: "Sabtu", short: "Sab" },
  { id: 0, label: "Minggu", short: "Min" },
];

export function RemindersView({ settings, operators, role }: RemindersViewProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [reminderTime, setReminderTime] = useState(settings.reminderTime.slice(0, 5));
  const [selectedDays, setSelectedDays] = useState<number[]>(settings.daysOfWeek);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(
    operators.filter((o) => o.receiveReminders).map((o) => o.id)
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testRecipientId, setTestRecipientId] = useState<number>(
    operators[0]?.telegramUserId || 0
  );

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
  };

  const toggleRecipient = (operatorId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(operatorId)
        ? prev.filter((id) => id !== operatorId)
        : [...prev, operatorId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== "owner" && role !== "admin") return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const formData = new FormData();
    formData.append("enabled", String(enabled));
    formData.append("reminderTime", reminderTime);
    selectedDays.forEach((d) => formData.append("daysOfWeek", String(d)));
    selectedRecipients.forEach((r) => formData.append("recipients", r));

    try {
      const res = await saveReminderSettingsAction(formData);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Gagal menyimpan pengaturan.");
      }
    } catch {
      setSaveError("Terjadi kesalahan jaringan.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testRecipientId) return;

    setTestSending(true);
    setTestSuccess(false);
    setTestError(null);

    try {
      const res = await sendTestReminderAction(testRecipientId);
      if (res.success) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 4000);
      } else {
        setTestError(res.error || "Gagal mengirim pesan uji coba.");
      }
    } catch {
      setTestError("Terjadi kesalahan jaringan.");
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Pengingat Harian Otomatis
        </h1>
        <p className="text-xs text-muted mt-1">
          Kirim notifikasi pengingat via Telegram ke operator jika belum ada transaksi atau konfirmasi status toko hari ini.
        </p>
      </div>

      {/* Inline Status Row */}
      <div className="card-base bg-surface border-border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted">Status:</span>
          {enabled ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Aktif
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border">
              Nonaktif
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted">
          <span>Jam: <strong className="text-foreground font-mono">{reminderTime}</strong> ({settings.timezone})</span>
          <span className="text-border">·</span>
          <span><strong className="text-foreground font-mono">{selectedDays.length}</strong> hari/pekan</span>
          <span className="text-border">·</span>
          <span><strong className="text-foreground font-mono">{selectedRecipients.length}</strong> dari {operators.length} operator</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Pengaturan pengingat harian berhasil disimpan.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* 1. Toggle Card */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">
              Aktifkan Pengingat Otomatis
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Sistem akan otomatis mengevaluasi status pembukuan harian pada jam yang ditentukan ({settings.timezone}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            disabled={role === "member"}
            aria-pressed={enabled}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
              enabled ? "bg-primary" : "bg-secondary border border-border"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 2. Schedule & Time */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted" />
                Jam Pengingat (Waktu Lokal)
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={role === "member"}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
              />
              <span className="text-[11px] text-muted mt-1 block">
                Zona Waktu: <span className="font-mono">{settings.timezone}</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-muted" />
                Kanal Pengiriman
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border border-border">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="w-3.5 h-3.5 text-primary focus:ring-0"
                  />
                  <span className="text-xs text-foreground font-medium">Telegram Bot (Utama)</span>
                </div>
                <p className="text-[11px] text-muted">
                  WhatsApp reminder saat ini ditangguhkan sampai template Cloud API selesai dikonfigurasi.
                </p>
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted" />
              Hari Aktif Pengingat
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    disabled={role === "member"}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-surface border-border text-muted hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Recipient Operators */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-muted" />
                Operator Penerima Pengingat
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Pilih operator Telegram yang akan menerima notifikasi jika ledger masih kosong.
              </p>
            </div>
          </div>

          {operators.length === 0 ? (
            <div className="p-4 bg-secondary/30 rounded-lg border border-border text-center text-xs text-muted">
              Belum ada operator Telegram terdaftar. Hubungkan operator di menu Kanal Pesan.
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {operators.map((op) => {
                const isChecked = selectedRecipients.includes(op.id);
                return (
                  <label
                    key={op.id}
                    className="flex items-center justify-between p-3 bg-surface hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipient(op.id)}
                        disabled={role === "member"}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <span className="text-xs font-medium text-foreground block">
                          {op.displayLabel || "Operator Telegram"}
                        </span>
                        <span className="text-[11px] text-muted font-mono">
                          ID: {op.telegramUserId}
                        </span>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[11px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Aktif
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Preview Message */}
        <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-2.5">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-muted" />
            Pratinjau Pesan Pengingat
          </h3>
          <div className="p-3 bg-secondary/50 rounded-lg border border-border font-mono text-xs text-foreground whitespace-pre-line leading-relaxed">
            {REMINDER_MESSAGE_TEXT}
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Pesan hanya dikirim bila belum ada transaksi penjualan dan status NO_SALE atau CLOSED belum dicatat.
          </p>
        </div>

        {/* Submit */}
        {role !== "member" && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* 5. Send Test Reminder Section */}
      <div className="card-base bg-surface border-border p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <Send className="w-4 h-4 text-sky-500" />
            Kirim Pesan Uji Coba (Test Reminder)
          </h3>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Kirimkan satu pesan uji coba langsung ke akun Telegram operator untuk memastikan koneksi bot aktif. Pesan ini tidak memengaruhi catatan finansial.
          </p>
        </div>

        {testSuccess && (
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-700 dark:text-sky-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Pesan uji coba berhasil dikirim ke Telegram.</span>
          </div>
        )}

        {testError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            value={testRecipientId}
            onChange={(e) => setTestRecipientId(Number(e.target.value))}
            disabled={testSending || operators.length === 0}
            className="px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary flex-1"
          >
            {operators.map((op) => (
              <option key={op.id} value={op.telegramUserId}>
                {op.displayLabel || "Operator"} (ID: {op.telegramUserId})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending || operators.length === 0 || role === "member"}
            className="px-3.5 py-2 bg-secondary hover:bg-surface-hover text-foreground text-xs font-medium rounded-lg border border-border transition-colors disabled:opacity-50 shrink-0"
          >
            {testSending ? "Mengirim..." : "Kirim Test Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
