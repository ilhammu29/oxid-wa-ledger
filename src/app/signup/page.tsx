"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage("Kata sandi minimal 6 karakter.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setErrorMessage("Email sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.");
        } else {
          setErrorMessage(error.message || "Gagal membuat akun. Silakan coba lagi.");
        }
        return;
      }

      if (data.user) {
        // If email confirmation is enabled and session is not automatically established:
        if (!data.session) {
          // Attempt immediate login if auto-confirm is enabled in Supabase local/production
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (signInErr) {
            setErrorMessage("Akun berhasil dibuat. Silakan periksa email Anda atau masuk.");
            router.push("/login");
            return;
          }
        }

        router.push("/onboarding");
        router.refresh();
      }
    } catch {
      setErrorMessage("Terjadi kendala saat memproses pendaftaran. Silakan coba sesaat lagi.");
    } finally {
      setLoading(false);
    }
  };

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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Budi Santoso"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@bisnis.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/10 min-h-[44px]"
            >
              {loading ? (
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
        </div>
      </div>
    </div>
  );
}
