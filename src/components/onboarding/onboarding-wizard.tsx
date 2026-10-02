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
import { BrandLogo } from "@/components/brand/brand-logo";

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
      <div className="max-w-md mx-auto bg-surface rounded-2xl border border-border shadow-xs p-8">
        <div className="text-center mb-6">
          <BrandLogo size="lg" className="mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Aktivasi Akun OXID</h2>
          <p className="text-xs text-muted mt-1">
            Undangan pendaftaran resmi untuk:
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-surface-hover border border-border text-foreground font-mono text-xs font-semibold">
            {invitedEmail}
          </span>
        </div>

        {authError && (
          <div className="p-3.5 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAuthenticate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Kata sandi akun
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
            />
            <p className="text-[11px] text-muted mt-1">
              Masukkan kata sandi akun Anda (atau buat baru jika baru pertama kali).
            </p>
          </div>

          <button
            type="submit"
            disabled={authLoading || !authPassword}
            className="w-full h-[46px] rounded-xl bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Lock className="w-4 h-4" />
            <span>{authLoading ? "Memverifikasi..." : "Lanjutkan ke Pengaturan Bisnis"}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
      {/* Progress Header */}
      <div className="bg-surface-hover/70 border-b border-border px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <div>
              <h1 className="font-bold text-sm tracking-tight text-foreground">
                Aktivasi Klien OXID WA Ledger
              </h1>
              <p className="text-[11px] text-muted font-mono">{currentUserEmail}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border text-foreground">
            Langkah {currentStep} dari {STEPS.length}
          </span>
        </div>

        {/* Step Tabs Indicator */}
        <div className="grid grid-cols-6 gap-1.5 pt-2 border-t border-border">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-1 text-center py-1 transition-all ${
                  isCurrent
                    ? "text-primary font-semibold"
                    : isCompleted
                    ? "text-foreground/80 font-medium"
                    : "text-muted"
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs transition-all ${
                    isCurrent
                      ? "bg-primary text-primary-fg font-bold shadow-xs shadow-primary/25 ring-2 ring-primary/20"
                      : isCompleted
                      ? "bg-primary/10 border border-primary/20 text-primary"
                      : "bg-surface border border-border text-muted"
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
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{submitError}</span>
          </div>
        )}

        {/* STEP 1: Profil Bisnis */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div>
              <h2 className="text-base font-bold text-foreground">Profil Bisnis</h2>
              <p className="text-xs text-muted mt-0.5">
                Masukkan informasi identitas unit usaha atau tambak Anda.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nama bisnis / tambak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Berkah Ternak Lele"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Zona waktu operasional
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs cursor-pointer"
                >
                  <option value="Asia/Jakarta">WIB — Asia/Jakarta (Jakarta, Sumatera, Jawa)</option>
                  <option value="Asia/Makassar">WITA — Asia/Makassar (Bali, NTB, NTT, Kalimantan)</option>
                  <option value="Asia/Jayapura">WIT — Asia/Jayapura (Maluku, Papua)</option>
                </select>
                <p className="text-[11px] text-muted mt-1.5">
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
              <h2 className="text-base font-bold text-foreground">Produk Pertama</h2>
              <p className="text-xs text-muted mt-0.5">
                Tentukan produk komoditas utama yang pertama kali dicatat dalam ledger.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Nama produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lele"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Satuan ukur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: kg"
                    value={productUnit}
                    onChange={(e) => setProductUnit(e.target.value)}
                    className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Harga default (IDR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={productPrice}
                    onChange={(e) => setProductPrice(Number(e.target.value))}
                    className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs tabular-nums"
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
              <h2 className="text-base font-bold text-foreground">Kanal Komunikasi Pilihan</h2>
              <p className="text-xs text-muted mt-0.5">
                Pilih kanal awal yang digunakan oleh tim operasional Anda.
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setChannel("telegram")}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  channel === "telegram"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-border/80 bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="channelOption"
                  checked={channel === "telegram"}
                  onChange={() => setChannel("telegram")}
                  className="mt-1 text-primary focus:ring-primary cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-sky-500" />
                    <span className="font-semibold text-xs text-foreground">
                      Telegram Bot (Direkomendasikan)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold">
                      Langsung Aktif
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Siap pakai langsung tanpa antrean verifikasi Meta. Mendukung pencatatan penjualan cepat dan pengingat harian otomatis.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setChannel("whatsapp")}
                className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                  channel === "whatsapp"
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-border/80 bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="channelOption"
                  checked={channel === "whatsapp"}
                  onChange={() => setChannel("whatsapp")}
                  className="mt-1 text-primary focus:ring-primary cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-xs text-foreground">
                      WhatsApp Cloud API
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
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
              <h2 className="text-base font-bold text-foreground">Operator Pertama</h2>
              <p className="text-xs text-muted mt-0.5">
                Daftarkan akun Telegram operator atau kasir utama yang berhak mengirim pesan.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Telegram User ID (Opsional)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 123456789 (dapat diperoleh dari @userinfobot di Telegram)"
                  value={telegramUserId}
                  onChange={(e) => setTelegramUserId(e.target.value)}
                  className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                />
                <p className="text-[11px] text-muted mt-1.5">
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
              <h2 className="text-base font-bold text-foreground">Pengingat Harian Otomatis</h2>
              <p className="text-xs text-muted mt-0.5">
                Kirim pengingat otomatis jika belum ada catatan transaksi atau status sebelum tutup buku.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-hover border border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Aktifkan Pengingat Harian</p>
                  <p className="text-[11px] text-muted">
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
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {enableReminder && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      Jam pengingat
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full h-[46px] px-3.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2">
                      Hari pengingat
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                      {DAYS.map((day) => {
                        const isSelected = reminderDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={`py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary border-primary text-primary-fg font-semibold shadow-xs"
                                : "bg-background border-border text-muted hover:text-foreground"
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
              <h2 className="text-base font-bold text-foreground">Ringkasan & Aktivasi</h2>
              <p className="text-xs text-muted mt-0.5">
                Periksa kembali konfigurasi unit usaha Anda sebelum mengaktifkan akun.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Nama Bisnis:</span>
                <span className="font-semibold text-foreground">{businessName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Zona Waktu:</span>
                <span className="font-mono text-foreground">{timezone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Produk Pertama:</span>
                <span className="font-semibold text-foreground">
                  {productName} ({productUnit}) — Rp {productPrice.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Kanal Pilihan:</span>
                <span className="font-semibold text-foreground uppercase">{channel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted">Operator Telegram:</span>
                <span className="font-mono text-foreground">
                  {telegramUserId || "Belum didaftarkan"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted">Pengingat Harian:</span>
                <span className="font-semibold text-foreground">
                  {enableReminder ? `Aktif (${reminderTime} WIB)` : "Nonaktif"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Setelah aktivasi, Anda akan menjadi <strong>Pemilik (Owner)</strong> bisnis ini dan langsung diarahkan ke Dashboard OXID WA Ledger.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 h-[44px] rounded-xl border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali</span>
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
              className="inline-flex items-center gap-1.5 px-6 h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-xs font-semibold text-primary-fg shadow-xs transition-colors cursor-pointer"
            >
              <span>Lanjutkan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-primary-fg transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{submitting ? "Mengaktifkan..." : "Aktifkan Bisnis & Buka Dashboard"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
