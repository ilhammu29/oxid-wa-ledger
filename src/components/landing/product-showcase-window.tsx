"use client";

import React from "react";
import {
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

interface ProductShowcaseWindowProps {
  className?: string;
}

/**
 * Simplified, cinematic product showcase window representing the real OXID Ledger dashboard.
 * Designed with restrained chrome, authentic financial numbers, calm trend curve,
 * live cashier transaction feed, and internal Telegram sync status.
 * Zero generic floating cards.
 */
export function ProductShowcaseWindow({ className = "" }: ProductShowcaseWindowProps) {
  return (
    <div
      className={`w-full max-w-5xl mx-auto rounded-xl sm:rounded-2xl border border-white/10 bg-[#0c0e15]/95 backdrop-blur-xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.8),0_0_40px_rgba(124,58,237,0.15)] overflow-hidden text-zinc-100 ${className}`}
    >
      {/* 1. Cinematic Window Top Chrome */}
      <div className="px-4 py-3 border-b border-white/8 bg-white/[0.02] flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-700/80" />
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" container="none" />
            <span className="text-xs font-semibold text-zinc-300 tracking-tight">
              Toko Berkah Sejahtera
            </span>
            <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
              · Ledger UMKM
            </span>
          </div>
        </div>

        {/* Integrated Bot Status (Inside UI, not floating) */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Bot Telegram Aktif</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            Sinkron 1 mnt lalu
          </span>
        </div>
      </div>

      {/* 2. Main Dashboard Stage */}
      <div className="p-4 sm:p-6 lg:p-7 space-y-6">
        {/* KPI Financial Metric Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Penjualan Hari Ini */}
          <div className="p-4 rounded-xl border border-white/6 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium">Omzet Hari Ini</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-mono text-[11px]">
                <TrendingUp className="w-3 h-3" />
                <span>+12.4%</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-white">
              Rp3.840.000
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>32 transaksi tercatat</span>
              <span className="text-zinc-400 font-medium">Target: Rp4.0M</span>
            </div>
          </div>

          {/* Card 2: Kas Tunai Diterima */}
          <div className="p-4 rounded-xl border border-white/6 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium">Kas Tunai Fisik</span>
              <span className="text-[11px] text-zinc-500 font-mono">63% omzet</span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-white">
              Rp2.420.000
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>21 transaksi kasir</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sesuai laci
              </span>
            </div>
          </div>

          {/* Card 3: Transfer & QRIS */}
          <div className="p-4 rounded-xl border border-white/6 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-medium">Non-Tunai (QRIS/Trf)</span>
              <span className="text-[11px] text-zinc-500 font-mono">37% omzet</span>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums text-white">
              Rp1.420.000
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>11 transaksi mutasi</span>
              <span className="text-zinc-400">Bank Mandiri / BCA</span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Revenue Chart Left + Live Feed Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Revenue Hourly Trend Chart (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl border border-white/6 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Arus Penjualan Per Jam
                </h4>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Puncak penjualan: 08:00 – 11:30 WIB
                </p>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
                Hari Ini
              </span>
            </div>

            {/* SVG Visual Revenue Chart Curve */}
            <div className="relative h-44 w-full">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 500 160"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="60%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#c4b5fd" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

                {/* Shaded Area */}
                <path
                  d="M 0 140 Q 70 135 120 95 T 240 50 T 360 40 T 450 75 L 500 65 L 500 160 L 0 160 Z"
                  fill="url(#chartAreaGradient)"
                />

                {/* Main Curve Line */}
                <path
                  d="M 0 140 Q 70 135 120 95 T 240 50 T 360 40 T 450 75 L 500 65"
                  fill="none"
                  stroke="url(#chartLineGradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Active Data Point */}
                <circle cx="360" cy="40" r="4.5" fill="#ffffff" stroke="#7c3aed" strokeWidth="2.5" />
              </svg>

              {/* Tooltip on active point */}
              <div className="absolute top-2 left-[65%] -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900 border border-violet-500/40 shadow-lg text-[10px] pointer-events-none">
                <span className="text-zinc-400">11:00 WIB: </span>
                <span className="text-white font-semibold font-mono">Rp1.120.000</span>
              </div>
            </div>

            {/* Time Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/6">
              <span>07:00</span>
              <span>09:00</span>
              <span>11:00</span>
              <span>13:00</span>
              <span>15:00</span>
              <span>17:00</span>
            </div>
          </div>

          {/* Live Telegram Orders Stream (5 cols) */}
          <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl border border-white/6 bg-white/[0.02] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-white/6 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h4 className="text-xs font-semibold text-zinc-300">
                  Transaksi Terakhir (Telegram)
                </h4>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Live</span>
            </div>

            {/* Transaction Items */}
            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    Lele Segar 5kg
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <span>Kasir Budi</span>
                    <span>·</span>
                    <span className="text-emerald-400">Tunai</span>
                    <span>·</span>
                    <span>08:42</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold font-mono text-white">
                    Rp140.000
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Tercatat</span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    Beras Premium 10kg
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <span>Kasir Siti</span>
                    <span>·</span>
                    <span className="text-violet-400">Transfer</span>
                    <span>·</span>
                    <span>08:35</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold font-mono text-white">
                    Rp155.000
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Tercatat</span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    Minyak Goreng 2L (2 pouch)
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <span>Kasir Budi</span>
                    <span>·</span>
                    <span className="text-emerald-400">Tunai</span>
                    <span>·</span>
                    <span>08:14</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold font-mono text-white">
                    Rp76.000
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">Tercatat</span>
                </div>
              </div>
            </div>

            {/* Bottom Feed Status */}
            <div className="pt-3 mt-1 border-t border-white/6 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Otomatis sinkron ke Sheets & Database</span>
              </span>
              <span className="text-zinc-500">100% akurat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
