"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  Bot,
  FileSpreadsheet,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/landing/theme-toggle";

export interface SignInProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  errorMessage?: string | null;
  queryError?: string | null;
  queryReset?: string | null;
  // Forgot password state
  showForgot: boolean;
  setShowForgot: (show: boolean) => void;
  forgotEmail: string;
  setForgotEmail: (email: string) => void;
  forgotLoading: boolean;
  forgotStatus?: string | null;
  onForgotPassword: (e: React.FormEvent) => void;
}

export function SignIn({
  email,
  setEmail,
  password,
  setPassword,
  loading,
  onSubmit,
  errorMessage,
  queryError,
  queryReset,
  showForgot,
  setShowForgot,
  forgotEmail,
  setForgotEmail,
  forgotLoading,
  forgotStatus,
  onForgotPassword,
}: SignInProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: REAL LOGIN FORM (Desktop: Left, Mobile: Single Column)       */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-[100dvh] max-w-xl mx-auto lg:max-w-none">
        {/* Top Navbar Area */}
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              OX
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight text-sm block">
                OXID Ledger
              </span>
              <span className="text-[10px] text-muted block -mt-0.5">
                Pencatatan Lewat Chat
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle showLabel={false} />
            <Link
              href="/"
              className="text-xs text-muted hover:text-foreground transition-colors hidden sm:inline"
            >
              Beranda
            </Link>
          </div>
        </div>

        {/* Center: Auth Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          {/* Status Notices */}
          {queryError === "verification_failed" && !errorMessage && (
            <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5 animate-login-in">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Tautan verifikasi email tidak valid atau sudah kedaluwarsa. Silakan masuk atau minta tautan baru.
              </span>
            </div>
          )}

          {queryReset === "success" && !errorMessage && (
            <div className="mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5 animate-login-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5 animate-login-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!showForgot ? (
            <div>
              {/* Form Heading & Description */}
              <div className="mb-8">
                <h1
                  className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2 animate-login-in"
                  style={{ animationDelay: "100ms" }}
                >
                  Selamat datang kembali
                </h1>
                <p
                  className="text-xs sm:text-sm text-muted leading-relaxed animate-login-in"
                  style={{ animationDelay: "200ms" }}
                >
                  Masuk untuk melanjutkan pencatatan dan operasional usaha Anda.
                </p>
              </div>

              {/* Login Form */}
              <form className="space-y-4" onSubmit={onSubmit}>
                {/* Email Field with Glass-style Wrapper */}
                <div
                  className="animate-login-in"
                  style={{ animationDelay: "300ms" }}
                >
                  <label
                    htmlFor="email"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email
                  </label>
                  <div className="relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@bisnisanda.com"
                      className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field with Glass-style Wrapper & Show/Hide Toggle */}
                <div
                  className="animate-login-in"
                  style={{ animationDelay: "400ms" }}
                >
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
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

                {/* Forgot Password Row */}
                <div
                  className="flex items-center justify-end pt-1 animate-login-in"
                  style={{ animationDelay: "500ms" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setShowForgot(true);
                    }}
                    className="text-xs text-primary hover:underline transition-colors cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>

                {/* Primary Submit Button */}
                <div
                  className="pt-2 animate-login-in"
                  style={{ animationDelay: "600ms" }}
                >
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-primary-fg bg-primary hover:opacity-95 shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px] cursor-pointer"
                  >
                    {loading ? (
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
                        <span>Memverifikasi...</span>
                      </span>
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Bottom Sign-up Link */}
                <div
                  className="pt-4 text-center animate-login-in"
                  style={{ animationDelay: "700ms" }}
                >
                  <p className="text-xs text-muted">
                    Belum punya akun?{" "}
                    <Link
                      href="/signup"
                      className="text-primary font-semibold hover:underline"
                    >
                      Buat akun
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          ) : (
            /* Forgot Password Form View */
            <div className="animate-login-in">
              <div className="mb-6">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-1.5">
                  Pemulihan Kata Sandi
                </h2>
                <p className="text-xs text-muted leading-relaxed">
                  Masukkan email terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi akun Anda.
                </p>
              </div>

              <form className="space-y-4" onSubmit={onForgotPassword}>
                <div>
                  <label
                    htmlFor="forgotEmail"
                    className="block text-xs font-medium text-foreground mb-1.5"
                  >
                    Email Terdaftar
                  </label>
                  <div className="relative flex items-center rounded-xl bg-surface border border-border focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-xs">
                    <div className="pl-3.5 flex items-center pointer-events-none text-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgotEmail"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@bisnisanda.com"
                      className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted focus:outline-none"
                    />
                  </div>
                </div>

                {forgotStatus && (
                  <div className="rounded-xl bg-surface border border-border p-3 text-xs text-foreground">
                    {forgotStatus}
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-primary-fg bg-primary hover:opacity-95 disabled:opacity-50 transition-all min-h-[44px] cursor-pointer"
                  >
                    {forgotLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4 animate-spin" />
                        Mengirim Tautan...
                      </span>
                    ) : (
                      <>
                        <span>Kirim Tautan Pemulihan</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="w-full text-xs text-muted hover:text-foreground py-2 transition-colors cursor-pointer"
                  >
                    Kembali ke Form Masuk
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-muted">
          <p>© {new Date().getFullYear()} OXID Ledger • Hak Cipta Dilindungi</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: OXID LEDGER VISUAL PANEL (Desktop only, hidden on mobile)   */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 p-4 lg:p-6 flex-col">
        <div
          className="w-full h-full flex flex-col justify-between p-8 xl:p-10 rounded-3xl bg-[#121215] text-zinc-100 border border-zinc-800/80 shadow-2xl relative overflow-hidden animate-login-in"
          style={{ animationDelay: "300ms" }}
        >
          {/* Subtle Ambient Background Gradients */}
          <div
            className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-3xl rounded-full pointer-events-none -z-0"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none -z-0"
            aria-hidden="true"
          />

          {/* Top Wordmark & Category */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs">
                OX
              </div>
              <span className="font-bold text-zinc-100 tracking-tight text-sm">
                OXID Ledger
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Sistem Pembukuan Transaksi UMKM</span>
            </div>
          </div>

          {/* Center: Hero Copy & Product Preview */}
          <div className="relative z-10 my-auto py-6">
            <div className="max-w-md mb-6">
              <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-zinc-100 leading-tight mb-3">
                Catat lebih cepat.{" "}
                <span className="text-primary">Pantau lebih rapi.</span>
              </h2>
              <p className="text-xs xl:text-sm text-zinc-400 leading-relaxed">
                Kelola transaksi, produk, status harian, Telegram, dan laporan usaha dari satu tempat.
              </p>
            </div>

            {/* Subtle Lightweight CSS Dashboard Preview */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-xl backdrop-blur-sm space-y-3">
              {/* Window Chrome */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 text-[10px] text-zinc-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span className="ml-1.5 text-zinc-300">Live Ledger</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Tersinkronisasi</span>
                </div>
              </div>

              {/* Mini KPI Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Omzet Hari Ini</span>
                  <span className="text-xs font-bold font-mono text-zinc-100">Rp 2.850.000</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Transaksi</span>
                  <span className="text-xs font-bold font-mono text-zinc-100">347 Nota</span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                  <span className="text-[10px] text-zinc-400 block mb-0.5">Pertumbuhan</span>
                  <span className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +18%
                  </span>
                </div>
              </div>

              {/* Mini Sparkline Visualization */}
              <div className="pt-1">
                <div className="h-14 w-full">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 400 60"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,45 Q40,35 80,42 T160,25 T240,35 T320,12 T400,20 L400,60 L0,60 Z"
                      fill="url(#panelGrad)"
                    />
                    <path
                      d="M0,45 Q40,35 80,42 T160,25 T240,35 T320,12 T400,20"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="160" cy="25" r="3" fill="#8B5CF6" />
                    <circle cx="320" cy="12" r="3.5" fill="#8B5CF6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: 3 Small REAL Capability Cards (Rule 10) */}
          <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-4 border-t border-zinc-800/80">
            {/* Card 1: Telegram */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 mb-1">
                <div className="h-5 w-5 rounded-md bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3" />
                </div>
                <span className="truncate">Telegram</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Catat transaksi langsung dari chat.
              </p>
            </div>

            {/* Card 2: Dashboard */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 mb-1">
                <div className="h-5 w-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-3 h-3" />
                </div>
                <span className="truncate">Dashboard</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Pantau transaksi dan aktivitas usaha.
              </p>
            </div>

            {/* Card 3: Google Sheets */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-100 mb-1">
                <div className="h-5 w-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-3 h-3" />
                </div>
                <span className="truncate">Google Sheets</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight">
                Sinkronkan laporan sebagai mirror operasional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
