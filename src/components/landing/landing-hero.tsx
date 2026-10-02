"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useHeroScroll } from "./use-hero-scroll";
import { LedgerOrbitArc } from "./ledger-orbit-arc";
import { ProductShowcaseWindow } from "./product-showcase-window";

interface LandingHeroProps {
  isAuthenticated: boolean;
}

/**
 * RedSun-inspired Cinematic Hero with Scroll-Driven Parallax Choreography.
 * Features 4 controlled depth layers:
 * - Layer 1: Ambient background lighting
 * - Layer 2: "Ledger Orbit" celestial arc
 * - Layer 3: Simplified real OXID dashboard mockup
 * - Layer 4: Foreground specular rim
 */
export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { progress, isMobile, reducedMotion } = useHeroScroll(stageRef);

  // Parallax Calculation Values (Desktop only, bypassed when reducedMotion or isMobile)
  // Progress 0.00 -> 0.40: Text active & fading
  // Progress 0.20 -> 0.65: Arc rising & expanding
  // Progress 0.40 -> 0.85: Dashboard emerging into primary focus

  const textTranslateY = isMobile || reducedMotion
    ? 0
    : Math.min(0, -progress * 140); // 0 -> -140px

  const textOpacity = isMobile || reducedMotion
    ? 1
    : Math.max(0, 1 - progress * 2.8); // 1.0 -> 0.0 around progress ~0.36

  const arcScale = isMobile || reducedMotion
    ? 1
    : 0.85 + Math.min(progress, 0.6) * 0.45; // 0.85 -> ~1.12

  const arcTranslateY = isMobile || reducedMotion
    ? 0
    : 80 - Math.min(progress, 0.65) * 160; // 80px -> -24px

  const arcOpacity = isMobile || reducedMotion
    ? 1
    : 0.55 + Math.min(progress, 0.5) * 0.9; // 0.55 -> 1.0

  const dashboardTranslateY = isMobile || reducedMotion
    ? 0
    : progress < 0.2
    ? 180
    : Math.max(0, 180 - (progress - 0.2) * 360); // 180px -> 0px between 0.2 and 0.7

  const dashboardOpacity = isMobile || reducedMotion
    ? 1
    : progress < 0.2
    ? 0
    : Math.min(1, (progress - 0.2) * 2.5); // 0 -> 1 between 0.2 and 0.6

  const dashboardScale = isMobile || reducedMotion
    ? 1
    : 0.94 + Math.min(Math.max(0, progress - 0.2), 0.5) * 0.12; // 0.94 -> 1.0

  return (
    <section
      ref={stageRef}
      className={`relative w-full ${
        isMobile || reducedMotion ? "min-h-auto pt-8 pb-16 sm:pb-24" : "h-[160vh]"
      } bg-[#090a0f] text-foreground overflow-hidden`}
    >
      {/* 1. Deep Space Atmospheric Lighting (Layer 1) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] lg:w-[1200px] h-[500px] bg-gradient-to-b from-violet-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-20"
        aria-hidden="true"
      />

      {/* STICKY STAGE CONTAINER (Desktop) or FLUID CONTAINER (Mobile / Reduced Motion) */}
      <div
        className={`${
          isMobile || reducedMotion
            ? "relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
            : "sticky top-0 h-screen w-full flex flex-col items-center justify-start overflow-hidden pt-12 sm:pt-16 px-4 sm:px-6 lg:px-8"
        }`}
      >
        {/* HERO TEXT STACK (Headline, Subhead, CTA row) */}
        <div
          className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center transition-all duration-75 will-change-transform"
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(0, ${textTranslateY}px, 0)`,
                  opacity: textOpacity,
                  pointerEvents: textOpacity < 0.1 ? "none" : "auto",
                }
          }
        >
          {/* Subtle Integrated Update Pill (No generic centered boilerplate) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md text-xs font-medium text-zinc-300 mb-5 shadow-xs">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>OXID v2.5 · Pencatatan Kasir Otomatis via Telegram</span>
          </div>

          {/* Deliberate Editorial Headline with Weight Contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] sm:leading-[1.1]">
            Catat penjualan.{" "}
            <span className="font-normal text-zinc-400 block sm:inline">
              Usaha tetap terkendali.
            </span>
          </h1>

          {/* Short, High-Legibility Supporting Copy (1-2 lines) */}
          <p className="mt-5 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Catat transaksi kasir lewat Telegram, pantau aktivitas usaha dari
            satu dashboard, dan simpan laporan usaha secara otomatis.
          </p>

          {/* Redesigned CTAs with Restrained Geometry & Refined Hover */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href={isAuthenticated ? "/dashboard" : "/signup"}
              className="group inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-6 sm:px-7 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-[0_0_24px_rgba(124,58,237,0.35)] transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isAuthenticated ? "Buka Dashboard" : "Mulai Gratis 14 Hari"}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#fitur"
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-5 sm:px-6 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 text-zinc-200 text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer"
            >
              <span>Lihat Cara Kerja</span>
              <ArrowDown className="w-3.5 h-3.5 text-zinc-400" />
            </a>
          </div>

          {/* Quiet Trust Indicator */}
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-zinc-400">
            <span>Tanpa kartu kredit</span>
            <span className="text-zinc-600">·</span>
            <span>Uji coba gratis 14 hari</span>
            <span className="text-zinc-600">·</span>
            <span>Setup 2 menit</span>
          </div>
        </div>

        {/* ATMOSPHERIC "LEDGER ORBIT" ARC (Layer 2) */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative w-full mt-6 -mb-32 sm:-mb-44 z-0"
              : "absolute left-1/2 -translate-x-1/2 top-[32%] sm:top-[28%] w-full flex justify-center z-10 will-change-transform pointer-events-none"
          }`}
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(-50%, ${arcTranslateY}px, 0) scale(${arcScale})`,
                  opacity: arcOpacity,
                }
          }
        >
          <LedgerOrbitArc />
        </div>

        {/* PRODUCT DASHBOARD PREVIEW STAGE (Layer 3) */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative z-10 w-full mt-6"
              : "absolute left-1/2 -translate-x-1/2 bottom-8 sm:bottom-12 w-full max-w-5xl px-4 z-20 will-change-transform"
          }`}
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(-50%, ${dashboardTranslateY}px, 0) scale(${dashboardScale})`,
                  opacity: dashboardOpacity,
                  pointerEvents: dashboardOpacity > 0.4 ? "auto" : "none",
                }
          }
        >
          <ProductShowcaseWindow />
        </div>
      </div>
    </section>
  );
}
