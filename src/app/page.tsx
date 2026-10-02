import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAllPlans, formatIDR } from "@/modules/subscriptions/plans";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Bot,
  Layers,
  Sparkles,
  BarChart3,
  Check,
  Radio,
  Clock,
} from "lucide-react";
import { EntryLoader } from "@/components/landing/entry-loader";
import { ThemeToggle } from "@/components/landing/theme-toggle";
import { HeroPreview } from "@/components/landing/hero-preview";
import { TelegramWorkflow } from "@/components/landing/telegram-workflow";
import { FaqAccordion } from "@/components/landing/faq-accordion";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = getAllPlans();

  const keyFeatures = [
    {
      title: "Pencatatan Cepat via Telegram",
      desc: "Operator atau kasir cukup mengirim pesan teks biasa. Tidak perlu membuka form rumit atau menginstal aplikasi kasir berat.",
      icon: Bot,
      tag: "Resmi & Cepat",
    },
    {
      title: "Pengenalan Produk & Alias",
      desc: "Mesin pencatat otomatis mengenali singkatan dan variasi sebutan produk khas usaha Anda (contoh: lele, ikan lele, LL-1).",
      icon: Sparkles,
      tag: "Anti Keliru",
    },
    {
      title: "Hitungan Rupiah Pasti Akurat",
      desc: "Mendukung desimal kilogram atau gram secara presisi tanpa pembulatan mengambang yang memicu selisih buku kas.",
      icon: Zap,
      tag: "Presisi Ledger",
    },
    {
      title: "Pengingat Tutup Buku Terjadwal",
      desc: "Notifikasi otomatis di jam operasional toko untuk memastikan seluruh transaksi hari itu telah dibukukan dengan rapi.",
      icon: Clock,
      tag: "Otomasi Harian",
    },
    {
      title: "Cermin Google Sheets Real-Time",
      desc: "Setiap transaksi otomatis dicerminkan satu arah ke Google Sheets usaha Anda secara instan dan rapi.",
      icon: FileSpreadsheet,
      tag: "Sinkron Cepat",
    },
    {
      title: "Isolasi Tenant Ketat (RLS)",
      desc: "Seluruh data transaksi dan master produk dilindungi Row Level Security (RLS) PostgreSQL setingkat perbankan.",
      icon: ShieldCheck,
      tag: "Aman & Terisolasi",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Hubungkan Kanal Chat",
      desc: "Daftarkan bisnis dan sambungkan bot Telegram usaha Anda dalam hitungan 1 menit dengan kode pairing aman.",
      icon: Radio,
    },
    {
      num: "02",
      title: "Atur Master Produk & Alias",
      desc: "Tentukan produk, harga jual standar, dan nama panggilan umum yang biasa digunakan oleh kasir di lapangan.",
      icon: Layers,
    },
    {
      num: "03",
      title: "Mulai Mencatat & Pantau",
      desc: "Kirim pesan transaksi kapan saja. Pantau omzet harian langsung dari dashboard web dan Google Sheets.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Futuristic Entry Loader with sessionStorage memory */}
      <EntryLoader />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              OX
            </div>
            <div>
              <span className="font-bold text-foreground tracking-tight text-sm sm:text-base block">
                OXID Ledger
              </span>
              <span className="text-[10px] text-muted block -mt-0.5">
                Pencatatan Lewat Chat
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted">
            <a href="#fitur" className="hover:text-foreground transition-colors">
              Fitur Utama
            </a>
            <a href="#cara-kerja" className="hover:text-foreground transition-colors">
              Cara Kerja
            </a>
            <a href="#simulasi" className="hover:text-foreground transition-colors">
              Simulasi Chat
            </a>
            <a href="#harga" className="hover:text-foreground transition-colors">
              Harga
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-fg text-xs font-semibold shadow-xs hover:opacity-95 transition"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors hidden sm:inline-flex"
                >
                  Masuk
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-fg text-xs font-semibold shadow-xs hover:opacity-95 transition"
                >
                  <span>Mulai Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden border-b border-border">
          {/* Subtle Ambient Background Gradients */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,var(--primary-subtle)_0%,transparent_70%)] pointer-events-none -z-10"
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Hero Copy */}
            <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
              {/* Product Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-[11px] font-semibold text-muted shadow-xs mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Solusi Pencatatan Penjualan & Pembukuan UMKM</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] mb-6">
                Kelola Penjualan UMKM{" "}
                <span className="text-primary bg-clip-text">
                  Lebih Mudah & Terintegrasi
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-sm sm:text-base text-muted leading-relaxed max-w-2xl mx-auto mb-8">
                Catat transaksi langsung lewat chat Telegram, kelola harga & produk,
                dapatkan pengingat harian otomatis, dan cerminkan buku kas ke Google
                Sheets secara real-time.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
                <Link
                  href={user ? "/dashboard" : "/signup"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-fg text-sm font-semibold shadow-md hover:opacity-95 transition-all"
                >
                  <span>{user ? "Buka Dashboard" : "Mulai Gratis Sekarang"}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#cara-kerja"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border hover:bg-surface-hover text-foreground text-sm font-semibold transition-colors"
                >
                  Lihat Cara Kerja
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Gratis Uji Coba 14 Hari</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Tanpa Kartu Kredit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Setup Cepat 2 Menit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Khusus Bisnis Nyata</span>
                </div>
              </div>
            </div>

            {/* Laptop Preview Mockup */}
            <HeroPreview />
          </div>
        </section>

        {/* Value Metrics Strip */}
        <section className="py-10 border-b border-border bg-surface/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  &lt; 1 Detik
                </div>
                <div className="text-xs text-muted mt-1">Kecepatan Catat Chat</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  100% Presisi
                </div>
                <div className="text-xs text-muted mt-1">Tanpa Selisih Desimal</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  Real-Time
                </div>
                <div className="text-xs text-muted mt-1">Sinkronisasi Google Sheets</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                  RLS Isolated
                </div>
                <div className="text-xs text-muted mt-1">Keamanan Data Terjamin</div>
              </div>
            </div>
          </div>
        </section>

        {/* Cara Kerja Section */}
        <section id="cara-kerja" className="py-16 sm:py-24 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3">
                <span>Alur Kerja Sederhana</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Tiga Langkah Mudah Menggunakan OXID Ledger
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2">
                Tidak membutuhkan instalasi server atau keahlian teknis khusus. Siap dalam hitungan menit.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between hover:border-primary/50 transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="font-mono text-2xl font-black text-muted/30">
                          {step.num}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive Telegram Simulation Section */}
        <section id="simulasi" className="py-16 sm:py-24 border-b border-border bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3">
                <Bot className="w-3.5 h-3.5" />
                <span>Simulasi Interaktif</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Pencatatan Senatural Berkirim Chat
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2">
                Coba lihat bagaimana bot Telegram OXID Ledger memproses pesan penjualan, mengingatkan rekap harian, dan mengisi spreadsheet secara otomatis.
              </p>
            </div>

            <TelegramWorkflow />
          </div>
        </section>

        {/* Real Key Features Section */}
        <section id="fitur" className="py-16 sm:py-24 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3">
                <span>Fitur Lengkap</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Dirancang Khusus untuk Kebutuhan Operasional UMKM
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2">
                Menghilangkan stres rekap malam hari dengan otomasi cerdas yang langsung bekerja.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyFeatures.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between hover:border-primary/40 transition-colors shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-hover border border-border text-muted">
                          {feat.tag}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-2">
                        {feat.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Authoritative Pricing Section */}
        <section id="harga" className="py-16 sm:py-24 border-b border-border bg-surface/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3">
                <span>Transparan & Fleksibel</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Pilihan Paket Langganan Sesuai Skala Usaha
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2">
                Mulai dengan masa uji coba gratis 14 hari. Perpanjang kapan saja tanpa biaya tersembunyi.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {plans.map((p) => {
                const isPro = p.code === "pro";
                const isPilot = p.code === "pilot";

                return (
                  <div
                    key={p.code}
                    className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                      isPro
                        ? "bg-surface border-2 border-primary shadow-xl"
                        : "bg-surface border border-border shadow-xs"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-fg text-[11px] font-bold px-3 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
                        Paling Populer
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">
                          {p.name}
                        </h3>
                        {isPilot && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                            UJI COBA
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted mb-6 leading-relaxed">
                        {p.description}
                      </p>

                      <div className="mb-6 pb-6 border-b border-border">
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                            {p.priceIdr === 0 ? "Gratis" : formatIDR(p.priceIdr)}
                          </span>
                          <span className="text-xs text-muted">
                            / {p.durationDays} hari
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-1">
                          Mendukung hingga{" "}
                          <strong className="text-foreground">{p.maxOperators} operator</strong>{" "}
                          terhubung.
                        </p>
                      </div>

                      {/* Features List */}
                      <ul className="space-y-3 mb-8">
                        {p.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5 text-xs text-muted">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-normal">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={user ? "/dashboard/subscription" : "/signup"}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-center transition-all ${
                        isPro
                          ? "bg-primary text-primary-fg shadow-sm hover:opacity-95"
                          : "bg-surface-hover hover:bg-surface border border-border text-foreground"
                      }`}
                    >
                      {user
                        ? "Pilih Paket Ini"
                        : isPilot
                        ? "Mulai Uji Coba Gratis"
                        : "Pilih Paket Ini"}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 sm:py-24 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold mb-3">
                <span>Pertanyaan Umum</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Kerap Ditanyakan Seputar OXID Ledger
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-2">
                Temukan jawaban cepat mengenai integrasi Telegram, sistem langganan, dan keamanan data.
              </p>
            </div>

            <FaqAccordion />
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-16 sm:py-20 bg-surface/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="p-8 sm:p-12 rounded-3xl bg-surface border border-border shadow-xl relative overflow-hidden">
              <div
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--primary-subtle)_0%,transparent_70%)] pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 max-w-2xl mx-auto">
                <div className="h-12 w-12 rounded-2xl bg-primary text-primary-fg flex items-center justify-center font-bold text-base mx-auto mb-4 shadow-md">
                  OX
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-4">
                  Siap Merapikan Pembukuan Usaha Anda?
                </h2>
                <p className="text-xs sm:text-sm text-muted leading-relaxed mb-8">
                  Hilangkan kerepotan rekap malam hari. Mulai catat transaksi secara
                  otomatis lewat chat dalam hitungan menit.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href={user ? "/dashboard" : "/signup"}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-fg text-sm font-semibold shadow-md hover:opacity-95 transition"
                  >
                    <span>{user ? "Masuk ke Dashboard" : "Daftar Uji Coba 14 Hari"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {!user && (
                    <Link
                      href="/login"
                      className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-surface border border-border text-foreground text-sm font-semibold hover:bg-surface-hover transition"
                    >
                      Masuk ke Akun
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-[10px]">
              OX
            </div>
            <span className="font-semibold text-foreground">OXID Ledger</span>
            <span>•</span>
            <span>Sistem Pencatatan Transaksi & Pembukuan UMKM</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Masuk
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Daftar
            </Link>
            <span className="text-[11px] font-mono text-muted">
              © {new Date().getFullYear()} OXID Ledger. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
