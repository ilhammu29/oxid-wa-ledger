"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Package,
  Radio,
  UserCheck,
  Bell,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send,
  Smartphone,
  Lock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { completeOnboardingAction } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/client";

interface OnboardingWizardProps {
  inviteToken: string;
  invitedEmail: string;
  initialUserEmail?: string;
}

const STEPS = [
  { id: 1, title: "Profil Bisnis", icon: Building2 },
  { id: 2, title: "Produk Pertama", icon: Package },
  { id: 3, title: "Kanal Komunikasi", icon: Radio },
  { id: 4, title: "Operator", icon: UserCheck },
  { id: 5, title: "Pengingat Harian", icon: Bell },
  { id: 6, title: "Konfirmasi", icon: CheckCircle2 },
];

const DAYS = [
  { id: 1, label: "Senin" },
  { id: 2, label: "Selasa" },
  { id: 3, label: "Rabu" },
  { id: 4, label: "Kamis" },
  { id: 5, label: "Jumat" },
  { id: 6, label: "Sabtu" },
  { id: 0, label: "Minggu" },
];

export function OnboardingWizard({
  inviteToken,
  invitedEmail,
  initialUserEmail,
}: OnboardingWizardProps) {
  const router = useRouter();

  // Authentication State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>(
    initialUserEmail
  );
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [currency] = useState("IDR");

  // Step 2: First Product
  const [productName, setProductName] = useState("Lele");
  const [productUnit, setProductUnit] = useState("kg");
  const [productPrice, setProductPrice] = useState(28000);

  // Step 3: Channel
  const [channel, setChannel] = useState<"telegram" | "whatsapp">("telegram");

  // Step 4: First Operator
  const [telegramUserId, setTelegramUserId] = useState<string>("");

  // Step 5: Daily Reminder
  const [enableReminder, setEnableReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState("18:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle Sign In / Up if not logged in
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      // Try sign in first
      const { data: signInData, error: signInErr } =
        await supabase.auth.signInWithPassword({
          email: invitedEmail,
          password: authPassword,
        });

      if (!signInErr && signInData.user) {
        setCurrentUserEmail(signInData.user.email);
        setAuthLoading(false);
        return;
      }

      // If sign in failed, attempt sign up
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invitedEmail,
        password: authPassword,
      });

      if (signUpErr) {
        setAuthError(
          signInErr?.message ||
            signUpErr.message ||
            "Gagal masuk atau mendaftar akun. Periksa kata sandi Anda."
        );
        setAuthLoading(false);
        return;
      }

      if (signUpData.user) {
        setCurrentUserEmail(signUpData.user.email);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Terjadi kesalahan autentikasi.");
    } finally {
      setAuthLoading(false);
    }
  };

  const toggleDay = (dayId: number) => {
    if (reminderDays.includes(dayId)) {
      setReminderDays(reminderDays.filter((d) => d !== dayId));
    } else {
      setReminderDays([...reminderDays, dayId]);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("inviteToken", inviteToken);
      formData.set("businessName", businessName);
      formData.set("timezone", timezone);
      formData.set("currency", currency);
      formData.set("productName", productName);
      formData.set("productUnit", productUnit);
      formData.set("productPrice", String(productPrice));
      formData.set("channel", channel);
      if (telegramUserId) {
        formData.set("telegramUserId", telegramUserId);
      }
      formData.set("enableReminder", String(enableReminder));
      formData.set("reminderTime", reminderTime);
      reminderDays.forEach((d) => formData.append("reminderDays", String(d)));

      const res = await completeOnboardingAction(formData);

      if (!res.success) {
        setSubmitError(res.error || "Gagal menyelesaikan onboarding.");
        setSubmitting(false);
        return;
      }

      // Success: redirect to dashboard
      router.push("/dashboard?onboarding=success");
      router.refresh();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
      setSubmitting(false);
    }
  };

  // If user is not yet logged in with the invited email
  if (!currentUserEmail) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-zinc-200/80 shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold text-lg mx-auto flex items-center justify-center mb-3">
            OX
          </div>
          <h2 className="text-xl font-bold text-zinc-900">Aktivasi Akun OXID</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Undangan pendaftaran resmi untuk:
          </p>
          <span className="inline-block mt-1 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 font-mono text-xs font-semibold">
            {invitedEmail}
          </span>
        </div>

        {authError && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Kata Sandi Akun
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Masukkan kata sandi akun Anda (atau buat baru jika baru pertama kali).
            </p>
          </div>

          <button
            type="submit"
            disabled={authLoading || !authPassword}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {authLoading ? "Memverifikasi..." : "Lanjutkan ke Pengaturan Bisnis"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-zinc-200/80 shadow-xl overflow-hidden">
      {/* Progress Header */}
      <div className="bg-zinc-950 px-6 py-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
              OX
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-zinc-100">
                Aktivasi Klien OXID WA Ledger
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">{currentUserEmail}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            Langkah {currentStep} dari {STEPS.length}
          </span>
        </div>

        {/* Step Tabs Indicator */}
        <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-zinc-800/80">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-1 text-center py-1 transition-all ${
                  isCurrent
                    ? "text-emerald-400 font-semibold"
                    : isCompleted
                    ? "text-zinc-300"
                    : "text-zinc-600"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isCurrent
                      ? "bg-emerald-400 text-zinc-950 font-bold"
                      : isCompleted
                      ? "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                </div>
                <span className="text-[10px] hidden sm:block truncate max-w-full">
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {submitError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* STEP 1: Profil Bisnis */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Profil Bisnis</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Masukkan informasi identitas unit usaha atau tambak Anda.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Bisnis / Tambak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Berkah Ternak Lele"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Zona Waktu Operasional
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="Asia/Jakarta">WIB — Asia/Jakarta (Jakarta, Sumatera, Jawa)</option>
                  <option value="Asia/Makassar">WITA — Asia/Makassar (Bali, NTB, NTT, Kalimantan)</option>
                  <option value="Asia/Jayapura">WIT — Asia/Jayapura (Maluku, Papua)</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Digunakan untuk perhitungan status harian dan batas waktu pengingat buku kas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Produk Pertama */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Produk Pertama</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tentukan produk komoditas utama yang pertama kali dicatat dalam ledger.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lele"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Satuan Ukur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: kg"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Harga Default (IDR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Kanal Komunikasi */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Kanal Komunikasi Pilihan</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Pilih kanal awal yang digunakan oleh tim operasional Anda.
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setChannel("telegram")}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  channel === "telegram"
                    ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="channelOption"
                  checked={channel === "telegram"}
                  onChange={() => setChannel("telegram")}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-600" />
                    <span className="font-semibold text-xs text-zinc-900">
                      Telegram Bot (Direkomendasikan untuk Pilot)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                      Langsung Aktif
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Siap pakai langsung tanpa antrean verifikasi Meta. Mendukung pencatatan penjualan cepat dan pengingat harian otomatis.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setChannel("whatsapp")}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  channel === "whatsapp"
                    ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="channelOption"
                  checked={channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-xs text-zinc-900">
                      WhatsApp Cloud API
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Memerlukan akun Meta Business terhubung dan nomor terverifikasi. Pengaturan detail dapat dihubungkan di dashboard setelah onboarding.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 4: Operator Pertama */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Operator Pertama</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Daftarkan akun Telegram operator atau kasir utama yang berhak mengirim pesan.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Telegram User ID (Opsional)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 123456789 (dapat diperoleh dari @userinfobot di Telegram)"
                  value={telegramUserId}
                  onChange={(e) => setTelegramUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Jika belum memiliki Telegram ID saat ini, Anda dapat menambahkannya nanti kapan saja lewat dashboard.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Pengingat Harian */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Pengingat Harian Otomatis</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Kirim pengingat otomatis jika belum ada catatan transaksi atau status sebelum tutup buku.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-200">
                <div>
                  <p className="text-xs font-semibold text-zinc-800">Aktifkan Pengingat Harian</p>
                  <p className="text-[11px] text-zinc-500">
                    Bot akan mengecek mutasi transaksi dan mengirim notifikasi jika belum tutup buku.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableReminder}
                    onChange={(e) => setEnableReminder(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {enableReminder && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Jam Pengingat
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">
                      Hari Pengingat
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {DAYS.map((day) => {
                        const isSelected = reminderDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                              isSelected
                                ? "bg-zinc-900 border-zinc-900 text-white"
                                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Konfirmasi */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Ringkasan & Aktivasi</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Periksa kembali konfigurasi unit usaha Anda sebelum mengaktifkan akun.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-200/60">
                <span className="text-zinc-500">Nama Bisnis:</span>
                <span className="font-semibold text-zinc-900">{businessName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/60">
                <span className="text-zinc-500">Zona Waktu:</span>
                <span className="font-mono text-zinc-900">{timezone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/60">
                <span className="text-zinc-500">Produk Pertama:</span>
                <span className="font-semibold text-zinc-900">
                  {productName} ({productUnit}) — Rp {productPrice.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/60">
                <span className="text-zinc-500">Kanal Pilihan:</span>
                <span className="font-semibold text-zinc-900 uppercase">{channel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/60">
                <span className="text-zinc-500">Operator Telegram:</span>
                <span className="font-mono text-zinc-900">
                  {telegramUserId || "Belum didaftarkan"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Pengingat Harian:</span>
                <span className="font-semibold text-zinc-900">
                  {enableReminder ? `Aktif (${reminderTime} WIB)` : "Nonaktif"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Setelah aktivasi, Anda akan menjadi <strong>Pemilik (Owner)</strong> bisnis ini dan langsung diarahkan ke Dashboard OXID WA Ledger.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1 && !businessName.trim()) {
                  setSubmitError("Nama bisnis wajib diisi.");
                  return;
                }
                if (currentStep === 2 && (!productName.trim() || !productUnit.trim())) {
                  setSubmitError("Nama produk dan satuan wajib diisi.");
                  return;
                }
                setSubmitError(null);
                setCurrentStep(currentStep + 1);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white transition-colors"
            >
              Lanjutkan
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-zinc-950 transition-colors shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {submitting ? "Mengaktifkan..." : "Aktifkan Bisnis & Buka Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
