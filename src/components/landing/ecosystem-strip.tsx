"use client";

import React from "react";
import {
  MessageSquare,
  LayoutDashboard,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "./reveal";

/**
 * Architectural Horizontal Integration Rail.
 * Anti-AI-slop design pass:
 * Replaces generic standalone boxed cards with a connected, editorial operational flow rail.
 * Visualizes the 4 operational touchpoints of OXID Ledger:
 * 1. Kasir via Telegram (Input)
 * 2. OXID Core Ledger Engine (Validation & Reconciliation)
 * 3. Dashboard Web Owner (Control & Insight)
 * 4. Google Sheets (Automated Audit & Archive)
 */
export function EcosystemStrip() {
  const steps = [
    {
      step: "01",
      role: "Input Kasir",
      title: "Grup Telegram",
      desc: "Kasir mencatat penjualan langsung dari chat dengan format natural seperti kasir harian.",
      icon: MessageSquare,
      badge: "Realtime",
    },
    {
      step: "02",
      role: "Mesin Inti",
      title: "OXID Engine",
      desc: "Validasi otomatis: pemisahan kas/QRIS, update stok produk, dan verifikasi mutasi ganda.",
      icon: ShieldCheck,
      badge: "Otomatis",
    },
    {
      step: "03",
      role: "Kontrol Owner",
      title: "Dashboard Web",
      desc: "Pantau omzet harian, performa kasir per shift, dan ringkasan laba kotor dari mana saja.",
      icon: LayoutDashboard,
      badge: "Analytics",
    },
    {
      step: "04",
      role: "Arsip & Akuntansi",
      title: "Google Sheets",
      desc: "Tiap transaksi mengalir otomatis ke spreadsheet usaha tanpa perlu unduh file berkala.",
      icon: FileSpreadsheet,
      badge: "Sync 2-Arah",
    },
  ];

  return (
    <section
      id="integrasi"
      className="relative z-30 bg-[#090a0f] border-t border-white/10 py-12 sm:py-16 text-foreground"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 sm:pb-10 border-b border-white/8">
          <Reveal delay={0} y={12} duration={500} className="max-w-2xl">
            <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-semibold block mb-2">
              Alur Operasional Terintegrasi
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              Satu sistem terhubung, tanpa ganti kebiasaan kasir
            </h2>
          </Reveal>

          <Reveal delay={80} y={12} duration={500} className="shrink-0">
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm">
              Kasir tetap menggunakan aplikasi pesan harian, pemilik usaha memegang kendali penuh atas angka penjualan.
            </p>
          </Reveal>
        </div>

        {/* Connected Horizontal Flow Rail */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/8 border border-white/8 rounded-2xl bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Reveal
                key={idx}
                delay={idx * 75}
                y={16}
                duration={500}
                className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between space-y-5 hover:bg-white/[0.02] transition-colors group"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="font-mono text-xs font-semibold text-zinc-500 group-hover:text-primary transition-colors">
                      {item.step}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-zinc-400">
                      {item.badge}
                    </span>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-primary group-hover:border-primary/40 transition-all mb-3.5 shadow-2xs">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="text-[11px] font-mono text-primary uppercase tracking-wider mb-1">
                    {item.role}
                  </div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed pt-2 border-t border-white/5">
                  {item.desc}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
