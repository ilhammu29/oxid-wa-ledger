import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

export function FinalCta() {
  return (
    <section className="py-20 sm:py-28 bg-surface border-b border-border relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <ScrollReveal>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Uji Coba Tanpa Risiko</span>
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
          Mulai catat transaksi usaha Anda dengan lebih rapi.
        </h2>

        <p className="mt-4 text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
          Tinggalkan kerumitan aplikasi kasir lambat dan kekhawatiran formula
          spreadsheet yang rusak. Aktifkan bot pencatatan toko Anda hari ini.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary text-primary-fg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 shadow-sm transition-all"
          >
            <span>Mulai Gratis 14 Hari</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#cara-kerja"
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-surface-hover hover:bg-border text-foreground text-sm font-medium border border-border flex items-center justify-center transition-colors"
          >
            Lihat Cara Kerja
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted font-mono">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Trial 14 hari penuh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Tanpa kartu kredit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Setup cepat &lt; 3 menit</span>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
