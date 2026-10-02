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
 * Root-Cause Rebuilt Architecture:
 * - HeroStage controls scroll travel duration (135dvh desktop, normal flow on mobile).
 * - HeroSticky controls sticky viewport presentation (top: 64px, calc(100dvh - 64px)).
 * - Container uses overflow-x: clip (no overflow: hidden on sticky parent), ensuring 100% reliable sticky pinning.
 * - Dashboard & Arc centered via `inset-x-0 mx-auto`, preventing Tailwind translate-x and inline transform-x compounding.
 * - At final hero state (progress 1.00), dashboard settles cleanly at bottom of viewport.
 * - Sticky stage unpins directly into next section with ZERO black dead zone.
 */
export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { progress, isMobile, reducedMotion } = useHeroScroll(stageRef);

  // Parallax Calculation Values (Desktop/Tablet only, bypassed when reducedMotion or isMobile)
  // Progress 0.00 -> 0.40: Hero text stack active & gently fading upward (-50px)
  // Progress 0.15 -> 0.70: Arc rising & expanding as atmospheric background
  // Progress 0.15 -> 0.85: Dashboard emerging into primary focus (65–75% visible at resting end position)
  // Progress 0.85 -> 1.00: Dashboard resting in place; sticky stage smoothly meets next section at 1.00

  const textTranslateY = isMobile || reducedMotion
    ? 0
    : Math.min(0, -progress * 60); // 0 -> -60px (restrained, no extreme jumping)

  const textOpacity = isMobile || reducedMotion
    ? 1
    : Math.max(0, 1 - progress * 2.5); // Fades out smoothly by progress ~0.40

  const arcScale = isMobile || reducedMotion
    ? 1
    : 0.90 + Math.min(progress, 0.85) * 0.15; // 0.90 -> 1.05

  const arcTranslateY = isMobile || reducedMotion
    ? 0
    : 40 - Math.min(progress, 0.85) * 60; // 40px -> -20px

  const arcOpacity = isMobile || reducedMotion
    ? 1
    : 0.40 + Math.min(progress, 0.70) * 0.55; // 0.40 -> 0.95

  const dashboardTranslateY = isMobile || reducedMotion
    ? 0
    : progress < 0.15
    ? 220
    : Math.max(0, 220 - ((progress - 0.15) / 0.70) * 220); // 220px -> 0px between 0.15 and 0.85

  const dashboardOpacity = isMobile || reducedMotion
    ? 1
    : progress < 0.15
    ? 0.20
    : Math.min(1, 0.20 + ((progress - 0.15) / 0.50) * 0.80); // 0.20 -> 1.0 between 0.15 and 0.65

  const dashboardScale = isMobile || reducedMotion
    ? 1
    : 0.95 + Math.min(Math.max(0, progress - 0.15) / 0.70, 1) * 0.05; // 0.95 -> 1.0

  return (
    <section
      ref={stageRef}
      className={`relative w-full ${
        isMobile || reducedMotion
          ? "min-h-auto pt-4 pb-12 sm:pb-16"
          : "min-h-[135dvh]"
      } bg-[#090a0f] text-foreground`}
    >
      {/* 1. Deep Space Atmospheric Lighting (Layer 1) - Contained in self-contained overflow wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] lg:w-[1200px] h-[500px] bg-gradient-to-b from-violet-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-20"
        />
      </div>

      {/* STICKY STAGE CONTAINER (Desktop) or FLUID CONTAINER (Mobile / Reduced Motion) */}
      <div
        className={`${
          isMobile || reducedMotion
            ? "relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
            : "sticky top-16 h-[calc(100dvh-4rem)] w-full flex flex-col items-center justify-start overflow-hidden pt-6 sm:pt-8 px-4 sm:px-6 lg:px-8"
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
          {/* Editorial Announcement Link (No generic SaaS pill, no live pulse dot) */}
          <a
            href="#integrasi"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors mb-5 border-b border-white/10 hover:border-white/30 pb-0.5"
          >
            <span>Pencatatan penjualan via Telegram</span>
            <span className="text-zinc-500 group-hover:text-zinc-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </a>

          {/* Deliberate Editorial Headline with Weight Contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12] sm:leading-[1.08] max-w-3xl mx-auto">
            <span>Catat penjualan.</span>{" "}
            <span className="font-normal text-zinc-400 block sm:inline">
              Usaha tetap terkendali.
            </span>
          </h1>

          {/* Short, High-Legibility Supporting Copy (1-2 lines) */}
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Catat transaksi kasir lewat Telegram, pantau aktivitas usaha dari
            satu dashboard, dan simpan laporan usaha secara otomatis.
          </p>

          {/* Redesigned CTAs with Restrained Geometry & Refined Hover */}
          <div className="mt-7 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
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

        {/* ATMOSPHERIC "LEDGER ORBIT" ARC (Layer 2) - Perfectly centered via inset-x-0 mx-auto */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative w-full mt-6 -mb-32 sm:-mb-44 z-0 overflow-hidden"
              : "absolute inset-x-0 mx-auto top-[28%] sm:top-[24%] w-full max-w-[1280px] flex justify-center z-10 will-change-transform pointer-events-none"
          }`}
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(0, ${arcTranslateY}px, 0) scale(${arcScale})`,
                  opacity: arcOpacity,
                }
          }
        >
          <LedgerOrbitArc />
        </div>

        {/* PRODUCT DASHBOARD PREVIEW STAGE (Layer 3) - Perfectly centered via inset-x-0 mx-auto */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative z-10 w-full mt-8"
              : "absolute inset-x-0 mx-auto bottom-0 w-full max-w-5xl px-4 z-20 will-change-transform"
          }`}
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(0, ${dashboardTranslateY}px, 0) scale(${dashboardScale})`,
                  opacity: dashboardOpacity,
                  pointerEvents: dashboardOpacity > 0.4 ? "auto" : "none",
                }
          }
        >
          <ProductShowcaseWindow />
        </div>
      </div>

      {/* Layer 4: Seamless Bottom Edge Transition Gradient */}
      <div
        className="absolute bottom-0 inset-x-0 h-16 sm:h-20 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/50 to-transparent pointer-events-none z-30"
        aria-hidden="true"
      />
    </section>
  );
}
