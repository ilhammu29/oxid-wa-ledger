import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  Banknote,
  Receipt,
  CheckCircle2,
  Radio,
  ArrowDown,
} from "lucide-react";

interface LandingHeroProps {
  isAuthenticated: boolean;
}

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-background">
      {/* 1. Signature Atmospheric Radial Form (RedSun-inspired, OXID Violet) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[600px] sm:w-[900px] lg:w-[1100px] h-[400px] sm:h-[600px] pointer-events-none -z-10"
        aria-hidden="true"
      >
        {/* Soft atmospheric radial gradient */}
        <div className="w-full h-full rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70 dark:opacity-60 scale-100" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 2. Top Product Announcement Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-surface/80 backdrop-blur-xs text-xs font-medium text-foreground shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Pembaruan v2.4 · Catat Penjualan via Chat Telegram</span>
          </div>
        </div>

        {/* 3. Confident Centered Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Catat penjualan tanpa ribet.
            <span className="block text-muted font-bold mt-1">
              Semua transaksi usaha, tetap rapi.
            </span>
          </h1>

          {/* 4. Short Human Description */}
          <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
            Catat penjualan lewat Telegram, pantau transaksi dari dashboard,
            dan simpan laporan usaha secara otomatis.
          </p>

          {/* 5. Dual Action Row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className="inline-flex items-center justify-center gap-2 h-12 px-7 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-md shadow-primary/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isAuthenticated ? "Buka Dashboard" : "Mulai Gratis 14 Hari"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#fitur"
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-sm font-medium transition-colors cursor-pointer"
            >
              <span>Pelajari Fitur</span>
              <ArrowDown className="w-4 h-4 text-muted" />
            </a>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Tanpa kartu kredit</span>
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Setup cepat dalam 2 menit</span>
            </span>
          </div>
        </div>

        {/* 6. Polished Elevated Product Visual Showcase */}
        <div className="mt-14 sm:mt-18 relative max-w-5xl mx-auto">
          {/* Subtle Outer Halo Ring */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/30 via-primary/10 to-transparent blur-md opacity-60 pointer-events-none" />

          {/* Realistic Dashboard Mockup Window */}
          <div className="relative rounded-xl sm:rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            {/* Window Top Chrome */}
            <div className="px-4 py-3 border-b border-border bg-surface-hover/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="text-border mx-1">|</span>
                <span className="text-xs text-muted font-mono hidden sm:inline">
                  app.oxidledger.com/dashboard
                </span>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Bot Terhubung · Sinkron Realtime</span>
              </div>
            </div>

            {/* Showcase Dashboard Body */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background/40">
              {/* 3 Overview KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Penjualan Hari Ini</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                    Rp3.840.000
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    +18.4% vs kemarin
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Saldo Kas Toko</span>
                    <Banknote className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                    Rp2.420.000
                  </div>
                  <div className="text-[11px] text-muted">
                    24 transaksi kasir tunai
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Pesanan Selesai</span>
                    <Receipt className="w-4 h-4 text-muted" />
                  </div>
                  <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                    30 Transaksi
                  </div>
                  <div className="text-[11px] text-muted">
                    100% tercatat rapi
                  </div>
                </div>
              </div>

              {/* Main Visual Content: Chart + Live Cashier Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left (7 cols): Revenue Trend Chart */}
                <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <h2 className="text-sm font-bold text-foreground">
                        Tren Penjualan Mingguan
                      </h2>
                      <span className="text-xs text-muted">
                        Pemasukan tunai dan transfer
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary">
                      Minggu Ini
                    </span>
                  </div>

                  {/* Clean SVG Area Chart */}
                  <div className="h-44 w-full relative flex items-end justify-between pt-6 pb-2 px-1">
                    {/* SVG Graphic with subtle calm violet gradient */}
                    <svg
                      viewBox="0 0 400 120"
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                      aria-label="Grafik Tren Penjualan"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 0,95 Q 60,80 120,60 T 240,40 T 320,25 T 400,10 L 400,120 L 0,120 Z"
                        fill="url(#chartGradient)"
                      />
                      {/* Line Stroke */}
                      <path
                        d="M 0,95 Q 60,80 120,60 T 240,40 T 320,25 T 400,10"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Chart baseline days */}
                    <div className="absolute bottom-0 inset-x-0 flex justify-between text-[10px] text-muted font-medium pt-2 border-t border-border/40">
                      <span>Sen</span>
                      <span>Sel</span>
                      <span>Rab</span>
                      <span>Kam</span>
                      <span>Jum</span>
                      <span>Sab</span>
                      <span className="text-primary font-bold">Min</span>
                    </div>
                  </div>
                </div>

                {/* Right (5 cols): Live Transactions Feed */}
                <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border border-border bg-surface space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-sm font-bold text-foreground">
                      Aktivitas Kasir Terkini
                    </span>
                    <span className="text-xs text-emerald-500 font-medium">
                      Otomatis
                    </span>
                  </div>

                  <div className="divide-y divide-border/60 text-xs">
                    {[
                      {
                        item: "Ikan Lele Segar (5 kg)",
                        detail: "Kasir 01 · Tunai",
                        price: "Rp140.000",
                        time: "08:42",
                      },
                      {
                        item: "Pakan Nila Starter (2 sak)",
                        detail: "Admin · Tunai",
                        price: "Rp300.000",
                        time: "08:35",
                      },
                      {
                        item: "Ikan Nila Segar (12 kg)",
                        detail: "Kasir 02 · Transfer BCA",
                        price: "Rp420.000",
                        time: "08:12",
                      },
                      {
                        item: "Ikan Gurame Hidup (3 kg)",
                        detail: "Kasir 01 · Tunai",
                        price: "Rp165.000",
                        time: "07:55",
                      },
                    ].map((tx, idx) => (
                      <div
                        key={idx}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-foreground block truncate">
                            {tx.item}
                          </span>
                          <span className="text-[11px] text-muted">
                            {tx.detail}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground tabular-nums block">
                            {tx.price}
                          </span>
                          <span className="text-[10px] text-muted">
                            {tx.time} WIB
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Window Bottom Status Bar */}
            <div className="px-4 py-2.5 border-t border-border bg-surface-hover/60 flex items-center justify-between text-xs text-muted">
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-primary" />
                <span>Grup Telegram Toko Aktif</span>
              </div>
              <span>Google Sheets Terhubung</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
