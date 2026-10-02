"use client";

import {
  TrendingUp,
  Receipt,
  Package,
  Layers,
  Bot,
  Bell,
  FileSpreadsheet,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Ambient background glow behind laptop */}
      <div
        className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-primary/15 blur-3xl rounded-full pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* Floating Badges (Desktop only, positioned around laptop) */}
      <div className="hidden lg:flex items-center gap-2 absolute -top-5 left-4 z-20 bg-surface/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-md text-xs">
        <div className="h-6 w-6 rounded-full bg-primary text-primary-fg flex items-center justify-center">
          <Bot className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-foreground">Transaksi via Chat</span>
          <span className="text-[10px] text-muted block -mt-0.5">Catat langsung dari Telegram</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 absolute -top-5 right-4 z-20 bg-surface/90 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-md text-xs">
        <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
          <FileSpreadsheet className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-semibold text-foreground">Sinkron ke Google Sheets</span>
          <span className="text-[10px] text-muted block -mt-0.5">Cermin data otomatis satu arah</span>
        </div>
      </div>

      {/* Modern Window / Device Frame */}
      <div className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Browser / OS Topbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-hover border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-[11px] font-mono text-muted hidden sm:inline">
              app.oxidledger.id/dashboard
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border font-medium text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Live Ledger
            </span>
          </div>
        </div>

        {/* Dashboard Shell Mockup */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[380px] bg-background">
          {/* Mini Sidebar (Desktop) */}
          <div className="hidden md:flex md:col-span-3 border-r border-border bg-surface/50 p-3 flex-col justify-between">
            <div className="space-y-4">
              {/* Business Badge */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div className="h-6 w-6 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-[10px]">
                  OX
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate text-foreground">Lele Pilot</div>
                  <div className="text-[10px] text-muted">Paket Pro • Aktif</div>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                {[
                  { name: "Overview", icon: Layers, active: true },
                  { name: "Transaksi", icon: Receipt, active: false },
                  { name: "Produk & Alias", icon: Package, active: false },
                  { name: "Pengingat Harian", icon: Bell, active: false },
                  { name: "Google Sheets", icon: FileSpreadsheet, active: false },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        item.active
                          ? "bg-primary text-primary-fg"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick status bottom */}
            <div className="p-2 rounded-lg bg-surface border border-border text-[10px] text-muted flex items-center justify-between">
              <span>Status Bot</span>
              <span className="font-semibold text-emerald-500">Tersambung</span>
            </div>
          </div>

          {/* Main Dashboard Body */}
          <div className="md:col-span-9 p-4 sm:p-5 space-y-4">
            {/* Greeting Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>Selamat datang kembali, Owner!</span>
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </h4>
                <p className="text-[11px] text-muted">
                  Ringkasan penjualan real-time per hari ini, 02 Oktober 2026.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 rounded bg-surface border border-border text-foreground font-mono">
                  + Catat Transaksi
                </span>
              </div>
            </div>

            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-muted block mb-1">Omzet Hari Ini</span>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  Rp 2.850.000
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+12%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-muted block mb-1">Omzet Minggu Ini</span>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  Rp 18.430.000
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+28%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-muted block mb-1">Total Transaksi</span>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  347 Nota
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+18%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface border border-border">
                <span className="text-[10px] text-muted block mb-1">Volume Terjual</span>
                <div className="text-xs sm:text-sm font-bold font-mono text-foreground">
                  1.248 kg
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-500 font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+12%</span>
                </div>
              </div>
            </div>

            {/* Mini Chart / Activity Strip */}
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <span>Grafik Tren Penjualan (30 Hari Terakhir)</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Puncak: Rp 6.750.000 / hari</span>
              </div>

              {/* Chart SVG Visualization */}
              <div className="h-24 w-full pt-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 80"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,60 Q50,45 100,55 T200,30 T300,45 T400,15 T500,25 L500,80 L0,80 Z"
                    fill="url(#heroGradient)"
                  />
                  <path
                    d="M0,60 Q50,45 100,55 T200,30 T300,45 T400,15 T500,25"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Highlight dots */}
                  <circle cx="200" cy="30" r="3.5" fill="var(--primary)" />
                  <circle cx="400" cy="15" r="4.5" fill="var(--primary)" />
                </svg>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-muted pt-1 border-t border-border/50">
                <span>01 Sep</span>
                <span>10 Sep</span>
                <span>20 Sep</span>
                <span>02 Okt (Hari Ini)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
