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
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-400" /> Pengaturan Pengingat Harian (Reminders)
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Kirim pengingat otomatis ke operator Telegram jika belum ada transaksi penjualan atau konfirmasi status libur.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {saveSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Pengaturan pengingat berhasil disimpan.
          </div>
        )}

        {saveError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {saveError}
          </div>
        )}

        {/* 1. Toggle ON / OFF */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Status Pengingat Otomatis</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Aktifkan evaluasi harian otomatis pada jam yang ditentukan ({settings.timezone}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            disabled={role === "member"}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${
              enabled ? "bg-emerald-500" : "bg-zinc-800"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-zinc-950 transition-transform duration-200 ease-in-out ${
                enabled ? "translate-x-6 bg-zinc-100" : "translate-x-0 bg-zinc-400"
              }`}
            />
          </button>
        </div>

        {/* 2. Schedule & Time */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Jam Pengingat (Waktu Lokal)
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={role === "member"}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">Zona Waktu: {settings.timezone}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" /> Channel Pengiriman
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-950 rounded-xl border border-emerald-500/30">
                  <input type="radio" checked readOnly className="text-emerald-500" />
                  <span className="text-xs text-zinc-200 font-medium">Telegram Bot (Didukung Penuh)</span>
                </div>
                <div className="p-2 bg-zinc-950/40 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-500 flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" />
                  <span>Reminder WhatsApp belum tersedia sampai konfigurasi template production selesai.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Hari Aktif Pengingat
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    disabled={role === "member"}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700"
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
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Operator Penerima Pengingat</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pilih operator Telegram yang berhak menerima notifikasi pengingat harian.
            </p>
          </div>

          {operators.length === 0 ? (
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 text-center text-xs text-zinc-500">
              Belum ada operator Telegram terdaftar. Hubungkan operator terlebih dahulu di menu setup bot.
            </div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => {
                const isChecked = selectedRecipients.includes(op.id);
                return (
                  <label
                    key={op.id}
                    className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipient(op.id)}
                        disabled={role === "member"}
                        className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0"
                      />
                      <div>
                        <span className="text-xs font-semibold text-zinc-200 block">
                          {op.displayLabel || "Operator Telegram"}
                        </span>
                        <span className="text-[11px] text-zinc-500 font-mono">
                          ID: {op.telegramUserId}
                        </span>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[11px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Penerima Aktif
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Preview Message Box */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
          <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400" /> Pratinjau Pesan Pengingat
          </h3>
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 font-mono text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
            {REMINDER_MESSAGE_TEXT}
          </div>
          <p className="text-[11px] text-zinc-500">
            Pesan ini hanya dikirimkan bila pada jam yang ditentukan belum ada transaksi penjualan terkonfirmasi, dan status NO_SALE atau CLOSED belum dicatat.
          </p>
        </div>

        {/* Submit Button */}
        {role !== "member" && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* 5. Send Test Reminder Section */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 pt-6 border-t-2 border-dashed border-zinc-800">
        <div>
          <h3 className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" /> Kirim Pesan Uji Coba (Test Reminder)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kirimkan satu pesan uji coba langsung ke akun Telegram operator untuk memastikan koneksi bot aktif.
            Pesan uji coba tidak mencatat mutasi finansial dan tidak mengonsumsi kuota pengingat harian.
          </p>
        </div>

        {testSuccess && (
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Pesan uji coba berhasil dikirim ke Telegram.
          </div>
        )}

        {testError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {testError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={testRecipientId}
            onChange={(e) => setTestRecipientId(Number(e.target.value))}
            disabled={testSending || operators.length === 0}
            className="px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 flex-1"
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
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shrink-0"
          >
            {testSending ? "Mengirim..." : "Kirim Test Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
