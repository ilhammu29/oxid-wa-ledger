"use client";

import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";

interface LandingHeroProps {
  isAuthenticated: boolean;
}

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <section className="relative pt-12 pb-8 sm:pt-16 sm:pb-12 text-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Subtle Category Pill */}
        <div className="animate-hero-eyebrow inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-[11px] font-medium text-muted mb-6 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Sistem Pembukuan & Penjualan UMKM</span>
        </div>

        {/* Short Editorial Headline with Line-Level Reveal */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.12] mb-5">
          <span className="inline-block animate-hero-headline-1">Catat penjualan.</span>{" "}
          <span className="inline-block animate-hero-headline-2 text-muted-foreground font-normal">
            Operasional tetap rapi.
          </span>
        </h1>

        {/* Concise Supporting Copy */}
        <p className="animate-hero-desc max-w-2xl mx-auto text-sm sm:text-base text-muted leading-relaxed mb-8">
          OXID Ledger membantu usaha kecil mencatat penjualan melalui Telegram,
          mengelola produk & harga, memantau aktivitas harian, dan menyinkronkan
          laporan ke Google Sheets.
        </p>

        {/* Dual CTAs */}
        <div className="animate-hero-cta flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={isAuthenticated ? "/dashboard" : "/signup"}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-fg text-sm font-medium shadow-xs hover:opacity-95 transition"
          >
            <span>{isAuthenticated ? "Buka Dashboard" : "Mulai Gratis 14 Hari"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="#cara-kerja"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-surface border border-border text-foreground hover:bg-surface-hover text-sm font-medium transition-colors"
          >
            <Route className="w-4 h-4 text-muted" />
            <span>Lihat Cara Kerja</span>
          </a>
        </div>
      </div>
    </section>
  );
}
