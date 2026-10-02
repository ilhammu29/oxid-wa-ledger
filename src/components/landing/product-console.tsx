"use client";

import { useEffect, useRef } from "react";
import {
  TrendingUp,
  Receipt,
  Package,
  Layers,
  Bot,
  FileSpreadsheet,
  CalendarCheck,
} from "lucide-react";

export function ProductConsole() {
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const cardARef = useRef<HTMLDivElement>(null);
  const cardBRef = useRef<HTMLDivElement>(null);
  const cardCRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If reduced motion is preferred, disable parallax calculations
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

    let mouseX = 0;
    let mouseY = 0;
    let currentScrollY = 0;
    let rafId: number;

    const onScroll = () => {
      currentScrollY = window.scrollY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDesktop || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      mouseX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
      mouseY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
    };

    const updateParallax = () => {
      // Calculate scroll parallax relative to hero (max 35px movement)
      const scrollFactor = Math.min(Math.max(currentScrollY * 0.07, 0), 35);

      // Console tilt: max 1.5deg rotation, max 3px translate
      if (consoleRef.current) {
        const rotX = isDesktop ? -mouseY * 1.5 : 0;
        const rotY = isDesktop ? mouseX * 1.5 : 0;
        const transX = isDesktop ? mouseX * 3 : 0;
        consoleRef.current.style.transform = `translate3d(${transX}px, ${scrollFactor}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }

      // Card A: slow upward movement, subtle mouse reaction
      if (cardARef.current && isDesktop) {
        const cAY = -scrollFactor * 0.5 - mouseY * 3;
        const cAX = -mouseX * 3;
        cardARef.current.style.transform = `translate3d(${cAX}px, ${cAY}px, 0)`;
      }

      // Card B: slightly faster downward movement, subtle mouse reaction
      if (cardBRef.current && isDesktop) {
        const cBY = scrollFactor * 0.6 + mouseY * 4;
        const cBX = mouseX * 4;
        cardBRef.current.style.transform = `translate3d(${cBX}px, ${cBY}px, 0)`;
      }

      // Card C: small horizontal drift, subtle mouse reaction
      if (cardCRef.current && isDesktop) {
        const cCX = scrollFactor * 0.35 + mouseX * 2;
        const cCY = scrollFactor * 0.2 + mouseY * 2;
        cardCRef.current.style.transform = `translate3d(${cCX}px, ${cCY}px, 0)`;
      }

      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    if (isDesktop) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    rafId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (isDesktop) {
        window.removeEventListener("mousemove", onMouseMove);
      }
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section ref={containerRef} className="relative pb-16 sm:pb-24 overflow-hidden">
      {/* LAYER 1: Background grid & subtle radial light */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-primary/10 dark:bg-primary/15 blur-3xl rounded-full" />
        <div
          className="absolute inset-0 opacity-[0.3] dark:opacity-[0.18]"
          style={{
            backgroundImage: `radial-gradient(var(--border) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* LAYER 2: Soft decorative signal lines */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-px bg-gradient-to-r from-transparent via-border to-transparent pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        {/* LAYER 4: Floating operational cards (Desktop only, positioned around console) */}
        {/* Card A: Telegram Recording */}
        <div
          ref={cardARef}
          className="animate-hero-card-1 hidden lg:flex absolute -left-4 xl:-left-8 top-16 z-20 items-center gap-3 p-3 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg max-w-[240px] pointer-events-none"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted">
              <span>Telegram Bot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs font-semibold text-foreground truncate">
              lele 5kg 26rb tunai
            </div>
            <div className="text-[11px] font-mono font-medium text-emerald-500">
              +Rp 130.000 (Tercatat)
            </div>
          </div>
        </div>

        {/* Card B: Google Sheets Mirror */}
        <div
          ref={cardBRef}
          className="animate-hero-card-2 hidden lg:flex absolute -right-4 xl:-right-8 top-12 z-20 items-center gap-3 p-3 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg max-w-[230px] pointer-events-none"
        >
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted">
              <span>Cermin Sheets</span>
              <span className="text-[10px] text-emerald-500">● 1-Arah</span>
            </div>
            <div className="text-xs font-semibold text-foreground truncate">
              Row 1.428 Ditambahkan
            </div>
            <div className="text-[11px] font-mono text-muted">
              Sinkronisasi selesai (32ms)
            </div>
          </div>
        </div>

        {/* Card C: Operational Status */}
        <div
          ref={cardCRef}
          className="animate-hero-card-3 hidden lg:flex absolute -right-2 xl:-right-6 bottom-16 z-20 items-center gap-3 p-3 rounded-xl border border-border bg-surface/95 backdrop-blur-md shadow-lg max-w-[220px] pointer-events-none"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-muted">Status Harian</div>
            <div className="text-xs font-semibold text-foreground">
              Operasional Aktif
            </div>
            <div className="text-[11px] font-mono text-foreground font-medium">
              24 Transaksi • Rp 3.84jt
            </div>
          </div>
        </div>

        {/* LAYER 3: Main Product Console with Depth */}
        <div style={{ perspective: 1200 }} className="animate-hero-console relative">
          <div
            ref={consoleRef}
            className="rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden transition-transform duration-100 ease-out"
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* LAYER 5: Delicate inner edge reflection */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 z-10" />

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
                      <div className="text-[10px] text-muted truncate">
                        Paket Pilot • 14 Hari
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-1 text-xs">
                    <div className="px-2.5 py-1.5 rounded-md bg-primary/10 text-primary font-medium flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span>Overview</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-md text-muted hover:text-foreground flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5" />
                      <span>Transaksi</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-md text-muted hover:text-foreground flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      <span>Master Produk</span>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-md text-muted hover:text-foreground flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Status Harian</span>
                    </div>
                  </div>
                </div>

                {/* Footer Sync Indicator */}
                <div className="p-2 rounded-lg bg-surface border border-border text-[11px] font-mono text-muted space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Google Sheets:</span>
                    <span className="text-emerald-500 font-semibold">Tersinkron</span>
                  </div>
                  <div className="text-[10px] text-muted truncate">
                    Sheet: Laporan_Okt_2026
                  </div>
                </div>
              </div>

              {/* Main Content Area (Col 9) */}
              <div className="col-span-1 lg:col-span-9 p-4 sm:p-6 space-y-6">
                {/* Metric Summary Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-surface">
                    <div className="text-[11px] font-mono text-muted">
                      Omzet Hari Ini
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-foreground font-mono mt-0.5">
                      Rp 3.840.000
                    </div>
                    <div className="text-[11px] text-emerald-500 flex items-center gap-1 mt-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>+14.2% dari kemarin</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-surface">
                    <div className="text-[11px] font-mono text-muted">
                      Total Transaksi
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-foreground font-mono mt-0.5">
                      24 Nota
                    </div>
                    <div className="text-[11px] text-muted flex items-center gap-1 mt-1">
                      <span>Rata-rata Rp 160.000</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-surface">
                    <div className="text-[11px] font-mono text-muted">
                      Volume Produk Terjual
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-foreground font-mono mt-0.5">
                      142.5 kg
                    </div>
                    <div className="text-[11px] text-primary flex items-center gap-1 mt-1">
                      <span>Lele Segar dominan 68%</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Sales Trend Curve */}
                <div className="p-4 rounded-xl border border-border bg-surface">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <span className="font-semibold text-foreground">
                      Tren Penjualan 7 Hari Terakhir
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      Rata-rata: Rp 3.4jt / hari
                    </span>
                  </div>
                  <div className="h-28 w-full">
                    <svg
                      viewBox="0 0 500 100"
                      className="w-full h-full stroke-primary fill-primary/10 overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,75 Q70,40 140,60 T280,30 T420,45 T500,20 L500,100 L0,100 Z"
                        fill="url(#chartGradient)"
                        stroke="none"
                      />
                      <path
                        d="M0,75 Q70,40 140,60 T280,30 T420,45 T500,20"
                        fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle cx="280" cy="30" r="3.5" className="fill-surface stroke-primary" strokeWidth="2" />
                      <circle cx="500" cy="20" r="3.5" className="fill-surface stroke-primary" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted mt-2 border-t border-border pt-1">
                    <span>Sen</span>
                    <span>Sel</span>
                    <span>Rab</span>
                    <span>Kam</span>
                    <span>Jum</span>
                    <span>Sab</span>
                    <span className="text-primary font-bold">Hari Ini</span>
                  </div>
                </div>

                {/* Live Transactions Feed Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Transaksi Buku Kas Terakhir
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      Auto-Refresh Telegram
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-surface overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-[11px] font-mono text-muted bg-surface-hover">
                          <th className="py-2 px-3">Waktu</th>
                          <th className="py-2 px-3">Item Penjualan</th>
                          <th className="py-2 px-3">Qty</th>
                          <th className="py-2 px-3">Total</th>
                          <th className="py-2 px-3">Metode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground font-mono text-[11px]">
                        <tr className="hover:bg-surface-hover/50 transition">
                          <td className="py-2 px-3 text-muted">14:32:05</td>
                          <td className="py-2 px-3 font-medium text-foreground">
                            Ikan Lele Segar
                          </td>
                          <td className="py-2 px-3">5 kg</td>
                          <td className="py-2 px-3 font-semibold text-emerald-500">
                            Rp 130.000
                          </td>
                          <td className="py-2 px-3 text-muted">Tunai</td>
                        </tr>
                        <tr className="hover:bg-surface-hover/50 transition">
                          <td className="py-2 px-3 text-muted">13:15:20</td>
                          <td className="py-2 px-3 font-medium text-foreground">
                            Ayam Potong Broiler
                          </td>
                          <td className="py-2 px-3">2 ekor</td>
                          <td className="py-2 px-3 font-semibold text-emerald-500">
                            Rp 68.000
                          </td>
                          <td className="py-2 px-3 text-muted">Transfer</td>
                        </tr>
                        <tr className="hover:bg-surface-hover/50 transition">
                          <td className="py-2 px-3 text-muted">11:45:10</td>
                          <td className="py-2 px-3 font-medium text-foreground">
                            Nila Hitam Konsumsi
                          </td>
                          <td className="py-2 px-3">3.5 kg</td>
                          <td className="py-2 px-3 font-semibold text-emerald-500">
                            Rp 112.000
                          </td>
                          <td className="py-2 px-3 text-muted">QRIS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
