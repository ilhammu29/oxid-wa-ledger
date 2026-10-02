import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface LedgerClosingCtaProps {
  isAuthenticated: boolean;
}

export function LedgerClosingCta({ isAuthenticated }: LedgerClosingCtaProps) {
  return (
    <section className="py-16 sm:py-20 border-b border-border bg-surface/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-surface p-8 sm:p-12 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            {/* Copy */}
            <div className="max-w-xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border bg-background text-[11px] font-mono text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>MULAI OPERASIONAL CEPAT</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                Mulai rapikan pembukuan kasir Anda hari ini.
              </h2>

              <p className="text-sm text-muted leading-relaxed">
                Tanpa beli mesin kasir baru, tanpa instal aplikasi berat. Aktifkan
                bot Telegram toko Anda dan rasakan kemudahan buku kas double-entry.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Uji coba gratis 14 hari</span>
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Bantuan setup via WhatsApp/Telegram</span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Link
                href={isAuthenticated ? "/dashboard" : "/signup"}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>{isAuthenticated ? "Buka Dashboard" : "Mulai Uji Coba 14 Hari"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs font-medium transition-colors cursor-pointer"
                >
                  Sudah punya akun? Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
