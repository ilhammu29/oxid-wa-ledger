"use client";

import {
  TrendingUp,
  Receipt,
  Package,
  Layers,
  Bot,
  FileSpreadsheet,
  CalendarCheck,
  Search,
} from "lucide-react";

export function ProductConsole() {
  return (
    <section className="relative pb-16 sm:pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Large Realistic Console Frame */}
        <div className="rounded-2xl border border-border bg-surface shadow-xl overflow-hidden transition-all">
          {/* Top Console Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-hover border-b border-border text-xs">
            {/* Left Workspace Indicator */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-muted hidden sm:inline mx-1">/</span>
              <span className="font-medium text-foreground">OXID Ledger</span>
              <span className="text-muted">/</span>
              <span className="text-muted">Overview</span>
            </div>

            {/* Operational Status Badges */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface border border-border text-emerald-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Telegram Aktif</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface border border-border text-emerald-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Sheets Tersinkron</span>
              </span>
            </div>
          </div>

          {/* Console Body: Mini Sidebar + Live Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px] bg-background">
            {/* Sidebar (Desktop only) */}
            <div className="hidden lg:flex lg:col-span-3 border-r border-border bg-surface/50 p-4 flex-col justify-between">
              <div className="space-y-4">
                {/* Business Profile */}
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-surface border border-border">
                  <div className="h-7 w-7 rounded-md bg-primary text-primary-fg flex items-center justify-center font-bold text-xs">
                    OX
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      Lele Pilot
                    </div>
                    <div className="text-[10px] text-muted">Paket Pro • Aktif</div>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  {[
                    { name: "Overview", icon: Layers, active: true },
                    { name: "Transaksi", icon: Receipt, active: false },
                    { name: "Produk & Alias", icon: Package, active: false },
                    { name: "Status Harian", icon: CalendarCheck, active: false },
                    { name: "Kanal Telegram", icon: Bot, active: false },
                    { name: "Google Sheets", icon: FileSpreadsheet, active: false },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                          item.active
                            ? "bg-primary text-primary-fg shadow-xs"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Quick Search Tag */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface border border-border text-[11px] text-muted font-mono">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3 h-3" />
                  <span>Cari...</span>
                </span>
                <span className="text-[10px] px-1 rounded bg-surface-hover border border-border">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Main Operational Dashboard View */}
            <div className="lg:col-span-9 p-4 sm:p-6 space-y-4">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Ringkasan Penjualan Hari Ini
                  </h3>
                  <p className="text-[11px] text-muted">
                    Pembaruan otomatis dari bot Telegram dan buku kas utama.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-muted bg-surface px-2.5 py-1 rounded-md border border-border w-fit">
                  02 Okt 2026 • Asia/Jakarta
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
                  <span className="text-[10px] text-muted font-medium block mb-0.5">
                    Omzet Hari Ini
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    Rp 2.850.000
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>+12% vs kemarin</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
                  <span className="text-[10px] text-muted font-medium block mb-0.5">
                    Total Transaksi
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    347 Nota
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18% pekan ini</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border shadow-2xs">
                  <span className="text-[10px] text-muted font-medium block mb-0.5">
                    Produk & Alias Aktif
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    8 Produk
                  </div>
                  <div className="text-[10px] text-muted mt-1">
                    <span>24 variasi alias terdaftar</span>
                  </div>
                </div>
              </div>

              {/* Two-Column Detail: Chart + Feed */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Left: Sales Chart Mockup */}
                <div className="md:col-span-7 p-3.5 rounded-xl bg-surface border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Grafik Penjualan Harian
                    </span>
                    <span className="text-[10px] font-mono text-muted">30 Hari Terakhir</span>
                  </div>

                  <div className="h-28 w-full pt-2">
                    <svg
                      className="w-full h-full overflow-visible"
                      viewBox="0 0 400 70"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="consoleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,55 Q50,45 100,50 T200,28 T300,40 T400,18 L400,70 L0,70 Z"
                        fill="url(#consoleGrad)"
                      />
                      <path
                        d="M0,55 Q50,45 100,50 T200,28 T300,40 T400,18"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="200" cy="28" r="3" fill="var(--primary)" />
                      <circle cx="400" cy="18" r="3.5" fill="var(--primary)" />
                    </svg>
                  </div>

                  <div className="flex justify-between text-[10px] font-mono text-muted border-t border-border/50 pt-1">
                    <span>01 Sep</span>
                    <span>15 Sep</span>
                    <span>02 Okt (Hari Ini)</span>
                  </div>
                </div>

                {/* Right: Live Ledger Feed */}
                <div className="md:col-span-5 p-3.5 rounded-xl bg-surface border border-border space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Transaksi Terbaru</span>
                    <span className="text-[10px] text-emerald-500 font-medium">● Real-time</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-surface-hover border border-border/50 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-foreground truncate">
                          Lele Segar 15kg
                        </div>
                        <div className="text-[10px] text-muted">Warung Barokah • Kasir 1</div>
                      </div>
                      <span className="font-mono font-semibold text-primary shrink-0">
                        Rp 375.000
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-hover border border-border/50 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-foreground truncate">
                          Pakan Lele Super 2 Sak
                        </div>
                        <div className="text-[10px] text-muted">Transfer Bank • Lunas</div>
                      </div>
                      <span className="font-mono font-semibold text-primary shrink-0">
                        Rp 760.000
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-surface-hover border border-border/50 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-medium text-foreground truncate">
                          Lele Konsumsi 8kg
                        </div>
                        <div className="text-[10px] text-muted">Pelanggan Umum • Tunai</div>
                      </div>
                      <span className="font-mono font-semibold text-primary shrink-0">
                        Rp 200.000
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="pt-1 text-[11px] text-muted text-right font-mono">
                *Pratinjau antarmuka operasional (data demo representatif)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
