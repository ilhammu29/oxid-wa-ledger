"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordResetAction } from "@/app/signup/actions";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Mail, KeyRound, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        if (msg.includes("invalid login credentials") || error.code === "invalid_credentials") {
          setErrorMessage("Email atau kata sandi tidak sesuai. Silakan coba lagi.");
        } else if (msg.includes("email not confirmed") || error.code === "email_not_confirmed") {
          setErrorMessage("Email belum diverifikasi. Silakan periksa kotak masuk atau spam email Anda.");
        } else if (msg.includes("rate limit") || error.status === 429) {
          setErrorMessage("Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat.");
        } else {
          setErrorMessage("Gagal masuk. Silakan periksa kembali email dan kata sandi Anda.");
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
        setForgotStatus("Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.");
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
    <div className="bg-zinc-900/60 border border-zinc-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 backdrop-blur-sm">
      {queryError === "verification_failed" && !errorMessage && (
        <div className="mb-6 rounded-xl bg-amber-950/40 border border-amber-800/50 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>Tautan verifikasi email tidak valid atau sudah kedaluwarsa. Silakan masuk atau minta tautan baru.</span>
        </div>
      )}

      {queryReset === "success" && !errorMessage && (
        <div className="mb-6 rounded-xl bg-emerald-950/40 border border-emerald-800/50 p-3.5 text-xs text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>Kata sandi Anda berhasil diperbarui. Silakan masuk dengan kata sandi baru.</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 rounded-xl bg-rose-950/40 border border-rose-800/50 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!showForgot ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@bisnis.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgot(true);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Lupa kata sandi?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memverifikasi...
              </span>
            ) : (
              "Masuk ke Dashboard"
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleForgotPassword}>
          <div className="flex items-center gap-2 mb-2 text-zinc-100">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold">Pemulihan Kata Sandi</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
          </p>

          <div>
            <label htmlFor="forgotEmail" className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Email Terdaftar
            </label>
            <input
              id="forgotEmail"
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="nama@bisnis.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
            />
          </div>

          {forgotStatus && (
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-xs text-zinc-300">
              {forgotStatus}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 transition-colors min-h-[44px]"
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
              className="w-full text-xs text-zinc-400 hover:text-zinc-300 py-1"
            >
              Kembali ke Form Masuk
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-zinc-800 text-center space-y-2">
        <p className="text-xs text-zinc-400">
          Belum punya akun?{" "}
          <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-semibold">
            Daftar uji coba 14 hari gratis
          </Link>
        </p>
        <p className="text-[11px] text-zinc-500">
          OXID Ledger • Sistem Pembukuan WhatsApp & Telegram
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold text-base flex items-center justify-center shadow-xs">
            OX
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">OXID Ledger</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Masuk ke Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Kelola operasional dan pembukuan bisnis Anda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="h-64 rounded-2xl bg-zinc-900/60 animate-pulse border border-zinc-800" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
