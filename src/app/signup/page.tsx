"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { registerUserAction, resendVerificationEmailAction } from "./actions";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type SignupStatus = "idle" | "submitting" | "success" | "email_confirmation_required" | "error";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<SignupStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    setErrorMessage(null);

    // Client pre-validation
    if (fullName.trim().length < 2) {
      setErrorMessage("Nama lengkap minimal 2 karakter.");
      setStatus("error");
      return;
    }

    if (!email.includes("@")) {
      setErrorMessage("Format email tidak valid.");
      setStatus("error");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password minimal 8 karakter.");
      setStatus("error");
      return;
    }

    setStatus("submitting");

    try {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("email", email);
      formData.set("password", password);

      const result = await registerUserAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || "Pendaftaran belum dapat diproses. Silakan coba lagi beberapa saat.");
        setStatus("error");
        return;
      }

      if (result.emailConfirmationRequired) {
        setStatus("email_confirmation_required");
        return;
      }

      // User registered with confirmed email -> sign in directly for browser session
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        console.warn("[Signup] Immediate signInWithPassword notice:", signInError.message);
        setStatus("success");
        router.push("/login");
        return;
      }

      setStatus("success");
      router.push("/onboarding");
      router.refresh();
    } catch {
      setErrorMessage("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      setStatus("error");
    }
  };

  const handleResend = async () => {
    if (resending || !email) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await resendVerificationEmailAction(email);
      if (res.success) {
        setResendStatus("Email verifikasi telah dikirim ulang. Silakan periksa kotak masuk atau spam.");
      } else {
        setResendStatus(res.error || "Gagal mengirim ulang email verifikasi. Silakan coba lagi.");
      }
    } catch {
      setResendStatus("Terjadi kendala koneksi.");
    } finally {
      setResending(false);
    }
  };

  const isSubmitting = status === "submitting";

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: SIGNUP FORM (~52% on desktop, 100% on mobile/tablet)         */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[52%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-[100dvh]">
        {/* Top Navigation Row: Back to Home + Theme Toggle */}
        <div className="w-full max-w-[540px] mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors group cursor-pointer"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            <span>Kembali ke Beranda</span>
          </Link>

          <ThemeToggle showLabel={false} />
        </div>

        {/* Centered Main Signup Block */}
        <div className="w-full max-w-[540px] mx-auto my-auto py-6 sm:py-8">
          {/* Natural Top Branding */}
          <div
            className="flex items-center gap-2.5 mb-6 animate-login-in"
            style={{ animationDelay: "50ms" }}
          >
            <BrandLogo size="md" />
            <div>
              <span className="font-bold text-foreground tracking-tight text-base block leading-tight">
                OXID Ledger
              </span>
              <span className="text-[11px] text-muted block">
                Pencatatan Lewat Chat
              </span>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="mb-6">
            <h1
              className="text-[28px] sm:text-[30px] lg:text-[36px] font-semibold tracking-tight text-foreground leading-[1.2] mb-2 animate-login-in"
              style={{ animationDelay: "100ms" }}
            >
              Mulai dengan OXID Ledger
            </h1>
            <p
              className="text-[15px] sm:text-base text-muted leading-relaxed animate-login-in"
              style={{ animationDelay: "180ms" }}
            >
              Buat akun untuk mulai mencatat dan mengelola operasional usaha Anda.
            </p>
          </div>

          {/* Email Confirmation Required View */}
          {status === "email_confirmation_required" ? (
            <div className="animate-login-in space-y-5">
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">
                    Cek email Anda
                  </h2>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm mx-auto">
                    Kami telah mengirim tautan verifikasi ke{" "}
                    <strong className="text-foreground font-medium">{email}</strong>. Silakan periksa kotak masuk atau folder spam Anda untuk mengaktifkan akun.
                  </p>
                </div>

                {resendStatus && (
                  <div className="rounded-xl bg-surface-hover border border-border p-3 text-xs text-foreground text-left">
                    {resendStatus}
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  <Link
                    href="/login"
                    className="w-full h-[50px] flex items-center justify-center gap-2 px-4 rounded-xl text-[14px] sm:text-[15px] font-medium text-primary-fg bg-primary hover:bg-primary-hover transition-colors shadow-xs"
                  >
                    <span>Lanjutkan ke Halaman Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs text-primary hover:underline disabled:opacity-50 py-1 transition-colors block mx-auto cursor-pointer"
                  >
                    {resending ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setErrorMessage(null);
                  }}
                  className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  ← Kembali ubah data pendaftaran
                </button>
              </div>
            </div>
          ) : status === "success" ? (
            /* Auto Sign-In Preparing View */
            <div className="animate-login-in p-8 rounded-2xl bg-surface border border-border shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Akun Berhasil Dibuat</h2>
              <p className="text-xs sm:text-sm text-muted">Menyiapkan ruang kerja Anda...</p>
            </div>
          ) : (
            /* Standard Signup Form */
            <>
              {errorMessage && (
                <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 animate-login-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Full Name Input */}
                <div
                  className="animate-login-in"
                  style={{ animationDelay: "260ms" }}
                >
                  <label
                    htmlFor="fullName"
                    className="block text-[13px] sm:text-[14px] font-medium text-foreground mb-1.5"
                  >
                    Nama lengkap
                  </label>
                  <div className="h-[50px] relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      disabled={isSubmitting}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Budi Santoso"
                      className="w-full bg-transparent px-3 h-full text-[14px] sm:text-[15px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div
                  className="animate-login-in"
                  style={{ animationDelay: "340ms" }}
                >
                  <label
                    htmlFor="email"
                    className="block text-[13px] sm:text-[14px] font-medium text-foreground mb-1.5"
                  >
                    Email
                  </label>
                  <div className="h-[50px] relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isSubmitting}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@bisnisanda.com"
                      className="w-full bg-transparent px-3 h-full text-[14px] sm:text-[15px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div
                  className="animate-login-in"
                  style={{ animationDelay: "420ms" }}
                >
                  <label
                    htmlFor="password"
                    className="block text-[13px] sm:text-[14px] font-medium text-foreground mb-1.5"
                  >
                    Kata sandi
                  </label>
                  <div className="h-[50px] relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      disabled={isSubmitting}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full bg-transparent px-3 h-full text-[14px] sm:text-[15px] text-foreground placeholder:text-muted focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="pr-3.5 flex items-center text-muted hover:text-foreground transition-colors cursor-pointer"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div
                  className="pt-2 animate-login-in"
                  style={{ animationDelay: "500ms" }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-[50px] flex items-center justify-center gap-2 px-4 rounded-xl text-[14px] sm:text-[15px] font-medium text-primary-fg bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4 text-primary-fg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Mendaftarkan Akun...</span>
                      </span>
                    ) : (
                      <>
                        <span>Daftar & Lanjutkan Onboarding</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Bottom Sign-in Link & Trial Badge */}
                <div
                  className="pt-3 text-center space-y-2 animate-login-in"
                  style={{ animationDelay: "580ms" }}
                >
                  <p className="text-xs sm:text-[13px] text-muted">
                    Sudah punya akun?{" "}
                    <Link
                      href="/login"
                      className="text-primary font-medium hover:underline"
                    >
                      Masuk
                    </Link>
                  </p>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Tanpa kartu kredit · Trial 14 hari</span>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="w-full max-w-[540px] mx-auto text-center text-[11px] text-muted">
          <p>© {new Date().getFullYear()} OXID Ledger • Hak Cipta Dilindungi</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: OXID ONBOARDING VISUAL PANEL (~48%, hidden on mobile/tablet)*/}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-[48%] p-4 lg:p-5 flex-col">
        <div
          className="w-full h-full flex flex-col justify-between p-8 xl:p-10 rounded-3xl bg-[#121215] text-zinc-100 border border-zinc-800/80 shadow-xl relative overflow-hidden animate-login-in"
          style={{ animationDelay: "250ms" }}
        >
          {/* Subtle Ambient Radial Gradient */}
          <div
            className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-0"
            aria-hidden="true"
          />

          {/* Top Brand & Category Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" container="primary" />
              <span className="font-semibold text-zinc-100 tracking-tight text-sm">
                OXID Ledger
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Langkah Awal</span>
            </div>
          </div>

          {/* Center Product Narrative & Onboarding Journey Preview */}
          <div className="relative z-10 my-auto py-6">
            <div className="max-w-md mb-6">
              <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-zinc-100 leading-tight mb-3">
                Dari pencatatan pertama{" "}
                <span className="text-primary">hingga laporan harian.</span>
              </h2>
              <p className="text-xs xl:text-sm text-zinc-400 leading-relaxed">
                Catat transaksi melalui Telegram, kelola produk, dan pantau aktivitas usaha dari satu dashboard.
              </p>
            </div>

            {/* Restrained Onboarding Visual Preview */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-md space-y-4">
              {/* Window / Card Header with Progress */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-zinc-200">Setup Usaha Anda</span>
                </div>
                <span className="text-[11px] font-mono text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  50% selesai
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full w-1/2" />
              </div>

              {/* Steps Checklist */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/60">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-zinc-200 font-medium">Buat akun & profil usaha</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Selesai</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/60">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-zinc-200 font-medium">Produk atau satuan pertama</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Selesai</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                      3
                    </div>
                    <span className="text-zinc-400">Hubungkan bot Telegram</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Langkah 3</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full border border-zinc-600 flex items-center justify-center text-[10px] text-zinc-500 font-mono">
                      4
                    </div>
                    <span className="text-zinc-400">Catat transaksi pertama lewat chat</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Langkah 4</span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-500 font-mono text-right pt-0.5">
                *Tahapan onboarding mandiri
              </div>
            </div>
          </div>

          {/* Bottom: 4 Sequential Steps */}
          <div className="relative z-10 grid grid-cols-4 gap-2 pt-4 border-t border-zinc-800/80">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <span className="text-[10px] font-mono text-primary font-bold block mb-0.5">01</span>
              <span className="text-[11px] font-medium text-zinc-200 block truncate">Buat Akun</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <span className="text-[10px] font-mono text-primary font-bold block mb-0.5">02</span>
              <span className="text-[11px] font-medium text-zinc-200 block truncate">Atur Produk</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <span className="text-[10px] font-mono text-primary font-bold block mb-0.5">03</span>
              <span className="text-[11px] font-medium text-zinc-200 block truncate">Sambung Bot</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-center">
              <span className="text-[10px] font-mono text-primary font-bold block mb-0.5">04</span>
              <span className="text-[11px] font-medium text-zinc-200 block truncate">Catat Kasir</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
