"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordResetAction } from "@/app/signup/actions";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Bot,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/landing/theme-toggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const queryError = searchParams.get("error");
  const queryReset = searchParams.get("reset");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("invalid login credentials") ||
          error.code === "invalid_credentials"
        ) {
          setErrorMessage("Email atau kata sandi tidak sesuai. Silakan coba lagi.");
        } else if (
          msg.includes("email not confirmed") ||
          error.code === "email_not_confirmed"
        ) {
          setErrorMessage(
            "Email belum diverifikasi. Silakan periksa kotak masuk atau spam email Anda."
          );
        } else if (msg.includes("rate limit") || error.status === 429) {
          setErrorMessage("Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.");
        } else {
          setErrorMessage(
            "Gagal masuk. Silakan periksa kembali email dan kata sandi Anda."
          );
        }
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kendala saat memproses login. Silakan coba sesaat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    setForgotLoading(true);

    try {
      const res = await requestPasswordResetAction(forgotEmail || email);
      if (res.success) {
        setForgotStatus(
          "Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam."
        );
      } else {
        setForgotStatus(res.error || "Gagal memproses permintaan reset kata sandi.");
      }
    } catch {
      setForgotStatus("Terjadi kendala koneksi server.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
      {/* Alert Notices */}
      {queryError === "verification_failed" && !errorMessage && (
        <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Tautan verifikasi email tidak valid atau sudah kedaluwarsa. Silakan masuk atau minta tautan baru.
          </span>
        </div>
      )}

      {queryReset === "success" && !errorMessage && (
        <div className="mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!showForgot ? (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Email Akun
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-foreground"
              >
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgot(true);
                }}
                className="text-xs text-primary hover:underline transition-colors"
              >
                Lupa kata sandi?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
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
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground cursor-pointer"
                aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-primary-fg bg-primary hover:opacity-95 shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[44px]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-primary-fg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memverifikasi...
              </span>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleForgotPassword}>
          <div className="flex items-center gap-2 mb-2 text-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Pemulihan Kata Sandi</h3>
              <p className="text-[11px] text-muted">
                Tautan pengaturan ulang akan dikirimkan ke email terdaftar.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="forgotEmail"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Email Terdaftar
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="forgotEmail"
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="nama@bisnisanda.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {forgotStatus && (
            <div className="rounded-xl bg-background border border-border p-3 text-xs text-foreground">
              {forgotStatus}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-primary-fg bg-primary hover:opacity-95 disabled:opacity-50 transition-all min-h-[44px]"
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
              onClick={() => {
                setShowForgot(false);
                setForgotStatus(null);
              }}
              className="w-full text-xs text-muted hover:text-foreground py-1.5 transition-colors cursor-pointer"
            >
              Kembali ke Form Masuk
            </button>
          </div>
        </form>
      )}

      {/* Card Footer */}
      <div className="mt-6 pt-5 border-t border-border text-center space-y-2">
        <p className="text-xs text-muted">
          Belum punya akun?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Daftar uji coba 14 hari gratis
          </Link>
        </p>
        <p className="text-[11px] text-muted">
          OXID Ledger • Sistem Pencatatan Transaksi & Pembukuan UMKM
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Top Simple Bar with Logo and Theme Toggle */}
      <header className="border-b border-border bg-surface/60 backdrop-blur-sm px-4 sm:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel={false} />
            <Link
              href="/"
              className="text-xs text-muted hover:text-foreground transition-colors hidden sm:inline"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* Left Column: Branding, Value Prop & Mini Dashboard (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8 pr-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle text-primary text-[11px] font-semibold mb-4">
                <Sparkles className="w-3 h-3" />
                <span>Solusi Lengkap untuk UMKM</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
                Kelola Penjualan dan Pembukuan{" "}
                <span className="text-primary">Lebih Mudah & Terkendali</span>
              </h1>

              <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl mb-6">
                Semua yang Anda butuhkan untuk mengelola usaha dalam satu tempat.
                Catat transaksi langsung dari chat, kelola produk & harga, pantau
                omzet real-time, dan sinkronkan pembukuan ke Google Sheets.
              </p>

              {/* Value Highlights */}
              <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <span>Catat via Telegram</span>
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    Pencatatan senatural chat sehari-hari tanpa aplikasi kasir berat.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <span>Cermin Google Sheets</span>
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    Tersinkronisasi otomatis satu arah secara instan dan rapi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span>Master Produk & Alias</span>
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    Mengenali singkatan nama produk dan menghitung rupiah presisi.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                    <div className="h-6 w-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <span>Isolasi Tenant RLS</span>
                  </div>
                  <p className="text-[11px] text-muted leading-normal">
                    Data transaksi terlindungi dengan standar keamanan PostgreSQL.
                  </p>
                </div>
              </div>
            </div>

            {/* Mini Dashboard Strip */}
            <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm max-w-xl">
              <div className="flex items-center justify-between text-xs mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-foreground">Status Operasional Usaha</span>
                </div>
                <span className="text-[10px] font-mono text-muted">Hari Ini</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-surface-hover">
                  <span className="text-[10px] text-muted block">Omzet</span>
                  <span className="text-xs font-bold font-mono text-foreground">Rp 2.850.000</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-hover">
                  <span className="text-[10px] text-muted block">Transaksi</span>
                  <span className="text-xs font-bold font-mono text-foreground">347 Nota</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-hover">
                  <span className="text-[10px] text-muted block">Pertumbuhan</span>
                  <span className="text-xs font-bold font-mono text-emerald-500 flex items-center justify-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    +18%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card (Mobile + Desktop) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            {/* Header above card */}
            <div className="text-center mb-6">
              <div className="inline-flex lg:hidden h-10 w-10 rounded-xl bg-primary text-primary-fg items-center justify-center font-bold text-sm shadow-xs mb-3">
                OX
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Masuk ke OXID Ledger
              </h2>
              <p className="text-xs text-muted mt-1">
                Kelola penjualan dan pembukuan bisnis Anda
              </p>
            </div>

            <Suspense
              fallback={
                <div className="h-80 rounded-2xl bg-surface border border-border animate-pulse" />
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border py-4 text-center text-[11px] text-muted">
        <p>© {new Date().getFullYear()} OXID Ledger • Hak Cipta Dilindungi</p>
      </footer>
    </div>
  );
}
