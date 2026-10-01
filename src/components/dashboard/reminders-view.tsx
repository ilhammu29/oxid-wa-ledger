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
  Sparkles,
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
    <div className="space-y-6 max-w-5xl">
      {/* Top 4 Summary Metric Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Status Pengingat */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status Pengingat
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              enabled
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-white/5 border border-white/10 text-zinc-500"
            }`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            {enabled ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-zinc-400 border border-white/10">
                Nonaktif
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {enabled ? "Evaluasi harian aktif" : "Pengingat dinonaktifkan"}
          </div>
        </div>

        {/* Metric 2: Waktu Eksekusi */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Waktu Eksekusi
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {reminderTime}
          </div>
          <div className="mt-2 text-[11px] text-purple-300 font-mono truncate">
            {settings.timezone}
          </div>
        </div>

        {/* Metric 3: Hari Terjadwal */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Hari Terjadwal
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {selectedDays.length}
            </span>
            <span className="text-xs text-zinc-400">Hari / Pekan</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-300">
            Jadwal mingguan
          </div>
        </div>

        {/* Metric 4: Penerima Terdaftar */}
        <div className="rounded-2xl border border-white/10 bg-[#111726]/80 backdrop-blur-md p-4 sm:p-5 relative overflow-hidden transition-all hover:border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Penerima Terdaftar
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              {selectedRecipients.length}
            </span>
            <span className="text-xs text-zinc-400">dari {operators.length} Operator</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-300">
            Kanal Telegram
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {saveSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pengaturan pengingat harian berhasil disimpan.</span>
          </div>
        )}

        {saveError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* 1. Toggle ON / OFF Card */}
        <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl flex items-center justify-between backdrop-blur-md shadow-2xl">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm sm:text-base">
                Status Pengingat Otomatis
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Aktifkan evaluasi harian otomatis pada jam yang ditentukan ({settings.timezone}).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            disabled={role === "member"}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
              enabled ? "bg-purple-600 shadow-lg shadow-purple-900/40" : "bg-white/10"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                enabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 2. Schedule & Time */}
        <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-5 backdrop-blur-md shadow-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Jam Pengingat (Waktu Lokal)
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={role === "member"}
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <span className="text-[11px] text-zinc-500 mt-1.5 block">
                Zona Waktu: <span className="font-mono text-zinc-400">{settings.timezone}</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-purple-400" />
                Channel Pengiriman
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 p-2.5 bg-white/5 rounded-xl border border-purple-500/30">
                  <input
                    type="radio"
                    checked
                    readOnly
                    className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 focus:ring-0"
                  />
                  <span className="text-xs text-white font-medium">Telegram Bot (Didukung Penuh)</span>
                </div>
                <div className="p-2.5 bg-white/[0.02] rounded-xl border border-white/5 text-[11px] text-zinc-400 flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                  <span>Reminder WhatsApp belum tersedia sampai konfigurasi template production selesai.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-2.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Hari Aktif Pengingat
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-500/50 text-white shadow-md shadow-purple-900/30"
                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
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
        <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl">
          <div>
            <h3 className="font-bold text-white text-sm sm:text-base">
              Operator Penerima Pengingat
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Pilih operator Telegram yang berhak menerima notifikasi pengingat harian.
            </p>
          </div>

          {operators.length === 0 ? (
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center text-xs text-zinc-400">
              Belum ada operator Telegram terdaftar. Hubungkan operator terlebih dahulu di menu Kanal Pesan.
            </div>
          ) : (
            <div className="space-y-2">
              {operators.map((op) => {
                const isChecked = selectedRecipients.includes(op.id);
                return (
                  <label
                    key={op.id}
                    className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10 cursor-pointer hover:border-purple-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipient(op.id)}
                        disabled={role === "member"}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                      />
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {op.displayLabel || "Operator Telegram"}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          ID: {op.telegramUserId}
                        </span>
                      </div>
                    </div>
                    {isChecked && (
                      <span className="text-[11px] text-purple-300 font-medium bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
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
        <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-3 backdrop-blur-md shadow-2xl">
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            Pratinjau Pesan Pengingat
          </h3>
          <div className="p-4 bg-[#090D16] rounded-xl border border-white/10 font-mono text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
            {REMINDER_MESSAGE_TEXT}
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Pesan ini hanya dikirimkan bila pada jam yang ditentukan belum ada transaksi penjualan terkonfirmasi, dan status NO_SALE atau CLOSED belum dicatat.
          </p>
        </div>

        {/* Submit Button */}
        {role !== "member" && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        )}
      </form>

      {/* 5. Send Test Reminder Section */}
      <div className="p-5 sm:p-6 bg-[#111726]/80 border border-white/10 rounded-2xl space-y-4 backdrop-blur-md shadow-2xl border-t-2 border-dashed border-purple-500/30">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" />
            Kirim Pesan Uji Coba (Test Reminder)
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Kirimkan satu pesan uji coba langsung ke akun Telegram operator untuk memastikan koneksi bot aktif.
            Pesan uji coba tidak mencatat mutasi finansial dan tidak mengonsumsi kuota pengingat harian.
          </p>
        </div>

        {testSuccess && (
          <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Pesan uji coba berhasil dikirim ke Telegram.</span>
          </div>
        )}

        {testError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{testError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={testRecipientId}
            onChange={(e) => setTestRecipientId(Number(e.target.value))}
            disabled={testSending || operators.length === 0}
            className="px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1"
          >
            {operators.map((op) => (
              <option key={op.id} value={op.telegramUserId} className="bg-[#111726] text-white">
                {op.displayLabel || "Operator"} (ID: {op.telegramUserId})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testSending || operators.length === 0 || role === "member"}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-white/10 transition-colors disabled:opacity-50 shrink-0"
          >
            {testSending ? "Mengirim..." : "Kirim Test Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}
