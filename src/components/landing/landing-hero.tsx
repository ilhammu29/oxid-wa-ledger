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
 * - Stage 1 (Progress 0.00 - 0.18): Hero Copy dominates. Dashboard is 100% INVISIBLE behind copy.
 * - Stage 2 (Progress 0.18 - 0.40): Copy fades; Ring rises and dynamically rotates in 3D (NO autoplay spin).
 * - Stage 3 (Progress 0.32 - 0.85): Dashboard emerges ONLY AFTER ring motion starts, ascending into dominant focus.
 * - Stage 4 (Progress 0.85 - 1.00): Dashboard settled at viewport bottom framing the ring; seamless bridge into EcosystemStrip.
 * - Complete Light & Dark mode support: uses semantic tokens (bg-background, text-foreground, text-muted, border-border).
 */
export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { progress, isMobile, reducedMotion } = useHeroScroll(stageRef);

  // Parallax Calculation Values (Desktop only, bypassed when reducedMotion or isMobile)
  
  // 1. Text Stack: Dominant initially, fades smoothly out between 0.18 and 0.40
  const textTranslateY = isMobile || reducedMotion
    ? 0
    : Math.min(0, -progress * 65);

  const textOpacity = isMobile || reducedMotion
    ? 1
    : progress < 0.18
    ? 1
    : Math.max(0, 1 - (progress - 0.18) / 0.22);

  // 2. Ring / Arc (The Primary Transition Object):
  // Rises, expands, and dynamically rotates on scroll!
  const arcRotation = isMobile || reducedMotion
    ? 0
    : progress < 0.15
    ? 0
    : Math.min(80, ((progress - 0.15) / 0.70) * 80); // 0deg -> 80deg

  const arcTranslateY = isMobile || reducedMotion
    ? 0
    : progress < 0.15
    ? 70
    : 70 - Math.min(1, (progress - 0.15) / 0.70) * 100; // 70px -> -30px

  const arcScale = isMobile || reducedMotion
    ? 1
    : 0.92 + Math.min(progress, 0.85) * 0.18; // 0.92 -> 1.10

  const arcOpacity = isMobile || reducedMotion
    ? 1
    : 0.50 + Math.min(progress, 0.70) * 0.45; // 0.50 -> 0.95

  // 3. Product Dashboard Preview:
  // MUST NOT BE VISIBLE AT INITIAL LOAD! (Strictly opacity: 0, pointerEvents: "none")
  // Begins entering ONLY after ring is clearly in motion (progress > 0.32)
  const dashboardOpacity = isMobile || reducedMotion
    ? 1
    : progress < 0.32
    ? 0
    : Math.min(1, (progress - 0.32) / 0.45); // 0.0 -> 1.0 between 0.32 and 0.77

  const dashboardTranslateY = isMobile || reducedMotion
    ? 0
    : progress < 0.32
    ? 360
    : Math.max(0, 360 - ((progress - 0.32) / 0.53) * 360); // 360px -> 0px between 0.32 and 0.85

  const dashboardScale = isMobile || reducedMotion
    ? 1
    : progress < 0.32
    ? 0.92
    : 0.92 + Math.min(1, (progress - 0.32) / 0.53) * 0.08; // 0.92 -> 1.0

  return (
    <section
      ref={stageRef}
      className={`relative w-full ${
        isMobile || reducedMotion
          ? "min-h-auto pt-4 pb-12 sm:pb-16"
          : "min-h-[140dvh]"
      } bg-background text-foreground`}
    >
      {/* 1. Atmospheric Ambient Lighting (Layer 1) - Theme-Aware */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] lg:w-[1200px] h-[500px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none -z-20"
        />
      </div>

      {/* STICKY STAGE CONTAINER (Desktop) or FLUID CONTAINER (Mobile / Reduced Motion) */}
      <div
        className={`${
          isMobile || reducedMotion
            ? "relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center"
            : "sticky top-16 h-[calc(100dvh-4rem)] w-full flex flex-col items-center justify-start overflow-hidden pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8"
        }`}
      >
        {/* HERO TEXT STACK (Headline, Subhead, CTA row) */}
        <div
          className="relative z-20 text-center max-w-4xl mx-auto flex flex-col items-center transition-all duration-75 will-change-transform pt-2"
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
          {/* Editorial Announcement Link */}
          <a
            href="#integrasi"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground transition-colors mb-5 border-b border-border hover:border-foreground/40 pb-0.5"
          >
            <span>Pencatatan penjualan via Telegram</span>
            <span className="text-muted/80 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </a>

          {/* Deliberate Editorial Headline with Weight Contrast */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.12] sm:leading-[1.08] max-w-3xl mx-auto">
            <span>Catat penjualan.</span>{" "}
            <span className="font-normal text-muted block sm:inline">
              Usaha tetap terkendali.
            </span>
          </h1>

          {/* Short, High-Legibility Supporting Copy (1-2 lines) */}
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
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
              className="inline-flex items-center justify-center gap-2 h-11 sm:h-12 px-5 sm:px-6 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer shadow-xs"
            >
              <span>Lihat Cara Kerja</span>
              <ArrowDown className="w-3.5 h-3.5 text-muted" />
            </a>
          </div>

          {/* Quiet Trust Indicator */}
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted">
            <span>Tanpa kartu kredit</span>
            <span className="text-border">·</span>
            <span>Uji coba gratis 14 hari</span>
            <span className="text-border">·</span>
            <span>Setup 2 menit</span>
          </div>
        </div>

        {/* ATMOSPHERIC "LEDGER ORBIT" ARC (Layer 2) - Positioned below copy, dynamically rotating */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative w-full mt-4 -mb-28 sm:-mb-36 z-0 overflow-hidden"
              : "absolute inset-x-0 mx-auto top-[28%] sm:top-[22%] w-full max-w-[1280px] flex justify-center z-10 will-change-transform pointer-events-none"
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
          <LedgerOrbitArc rotation={arcRotation} />
        </div>

        {/* PRODUCT DASHBOARD PREVIEW STAGE (Layer 3) - Perfectly centered, reveals late */}
        <div
          className={`${
            isMobile || reducedMotion
              ? "relative z-10 w-full mt-6"
              : "absolute inset-x-0 mx-auto bottom-0 w-full max-w-5xl px-4 z-20 will-change-transform"
          }`}
          style={
            isMobile || reducedMotion
              ? undefined
              : {
                  transform: `translate3d(0, ${dashboardTranslateY}px, 0) scale(${dashboardScale})`,
                  opacity: dashboardOpacity,
                  pointerEvents: dashboardOpacity > 0.5 ? "auto" : "none",
                }
          }
        >
          <ProductShowcaseWindow />
        </div>
      </div>

      {/* Layer 4: Seamless Bottom Edge Transition Gradient */}
      <div
        className="absolute bottom-0 inset-x-0 h-16 sm:h-20 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-30"
        aria-hidden="true"
      />
    </section>
  );
}
