"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerUserAction, resendVerificationEmailAction } from "./actions";
import Link from "next/link";
import { ArrowRight, AlertCircle, Sparkles, CheckCircle2, Mail } from "lucide-react";

type SignupStatus = "idle" | "submitting" | "success" | "email_confirmation_required" | "error";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        // If signIn fails (e.g. unexpected auth policy), redirect to /login with email prefilled
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
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold text-base flex items-center justify-center shadow-xs">
            OX
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">OXID Ledger</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Mulai Uji Coba Gratis 14 Hari
        </h1>
        <p className="mt-1.5 text-xs text-zinc-400">
          Buat akun untuk mulai mencatat transaksi usaha lewat chat Telegram
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-zinc-900/60 border border-zinc-800 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 backdrop-blur-sm">
          {status === "email_confirmation_required" ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <Mail className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-100">Pendaftaran Berhasil</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tautan konfirmasi telah dikirim ke <strong>{email}</strong>. Silakan periksa kotak masuk atau spam email Anda untuk mengaktifkan akun.
                </p>
              </div>

              {resendStatus && (
                <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5 text-xs text-zinc-300 text-left">
                  {resendStatus}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors"
                >
                  <span>Lanjutkan ke Halaman Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-50 py-1 transition-colors block mx-auto"
                >
                  {resending ? "Mengirim ulang..." : "Kirim ulang email verifikasi"}
                </button>
              </div>
            </div>
          ) : status === "success" ? (
            <div className="text-center space-y-3 py-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-zinc-100">Akun Berhasil Dibuat</h3>
              <p className="text-xs text-zinc-400">Menyiapkan ruang kerja Anda...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 rounded-xl bg-rose-950/40 border border-rose-800/50 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                  >
                    Nama Lengkap
                  </label>
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@bisnis.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    disabled={isSubmitting}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/10 min-h-[44px]"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-zinc-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Mendaftarkan Akun...
                    </span>
                  ) : (
                    <>
                      <span>Daftar & Lanjutkan Onboarding</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-zinc-800 text-center space-y-2">
                <p className="text-xs text-zinc-400">
                  Sudah memiliki akun?{" "}
                  <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                    Masuk di sini
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  <span>Tanpa kartu kredit • Otomatis aktif 14 hari</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
