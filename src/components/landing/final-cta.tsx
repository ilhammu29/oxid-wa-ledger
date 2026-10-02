import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface FinalCtaProps {
  isAuthenticated: boolean;
}

export function FinalCta({ isAuthenticated }: FinalCtaProps) {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-background border-t border-border/80">
      {/* Signature Atmospheric Background Radial (Ledger Orbit bloom) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] sm:h-[500px] pointer-events-none -z-10"
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl opacity-75 dark:opacity-65" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-md p-8 sm:p-14 text-center shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-primary">
              MULAI SEKARANG
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
              Mulai catat usaha dengan lebih sederhana.
            </h2>

            <p className="text-base sm:text-lg text-muted leading-relaxed">
              Daftarkan toko Anda hari ini. Nikmati kemudahan mencatat penjualan
              lewat Telegram dan pantau omzet usaha Anda secara rapi.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Link
                href={isAuthenticated ? "/dashboard" : "/signup"}
                className="group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isAuthenticated ? "Buka Dashboard" : "Mulai Gratis 14 Hari"}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>

              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Masuk ke Akun
                </Link>
              )}
            </div>

            <div className="pt-2 flex items-center justify-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tanpa kartu kredit</span>
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Batalkan kapan saja</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
