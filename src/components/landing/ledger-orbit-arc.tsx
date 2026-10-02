"use client";

import React from "react";

interface LedgerOrbitArcProps {
  className?: string;
  style?: React.CSSProperties;
  rotation?: number; // Scroll-driven rotation angle in degrees (e.g. 0 to 65)
  isMobile?: boolean;
}

/**
 * "Ledger Orbit" Atmospheric Arc — Refinement & Anti-Banding Pass
 * An original OXID celestial visual motif inspired by RedSun's illuminated planetary curvature.
 * Features:
 * - Substantially thicker physical ring body (~130px thick in SVG coordinates, 90px in projected 3D space).
 * - Multi-tier anti-banding atmospheric lighting: near core aura + smooth Hermite bloom + far horizon lift.
 * - Hardware-accelerated SVG noise dither overlay to completely eradicate 8-bit Mach bands.
 * - Dual-edge 3D architecture: bright illuminated outer rim + concentric machined groove + dark inner bevel shade.
 * - Responsive 3D perspective: rotateX(46deg) on desktop, rotateX(40deg) on mobile for open celestial depth.
 * - Dedicated mobile composition: compact height and centered framing without awkward dead zones.
 * - Full Dark & Light mode theme-aware tokens.
 */
export function LedgerOrbitArc({
  className = "",
  style = {},
  rotation = 0,
  isMobile = false,
}: LedgerOrbitArcProps) {
  // Precision ticks along the celestial arc (9 mathematically calculated normal coordinates)
  const ticks = [
    { x1: 150, y1: 321, x2: 169, y2: 333 },
    { x1: 254, y1: 184, x2: 270, y2: 200 },
    { x1: 371, y1: 92, x2: 382, y2: 111 },
    { x1: 499, y1: 43, x2: 503, y2: 64 },
    { x1: 600, y1: 32, x2: 600, y2: 54 },
    { x1: 701, y1: 43, x2: 697, y2: 64 },
    { x1: 829, y1: 92, x2: 818, y2: 111 },
    { x1: 946, y1: 184, x2: 930, y2: 200 },
    { x1: 1050, y1: 321, x2: 1031, y2: 333 },
  ];

  return (
    <div
      className={`relative w-full max-w-[500px] sm:max-w-[760px] lg:max-w-[1340px] h-[210px] sm:h-[320px] lg:h-[540px] pointer-events-none select-none flex items-start justify-center overflow-visible ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. Multi-Tier Anti-Banding Atmospheric Glow System */}

      {/* 1a. Localized Separation Lift (Directly under ring apex with 7-stop Hermite easing) */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-[80%] h-[260px] sm:h-[380px] pointer-events-none -z-20 transition-opacity duration-300"
        style={{
          background: "var(--ring-separation-gradient)",
        }}
      />

      {/* 1b. Smooth Far Horizon Glow (Multi-stop distribution prevents Mach bands) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[92%] sm:w-[86%] h-[240px] sm:h-[360px] rounded-full blur-[50px] sm:blur-[75px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 25%, var(--ring-glow-far) 0%, rgba(99, 102, 241, 0.12) 25%, rgba(99, 102, 241, 0.05) 50%, rgba(99, 102, 241, 0.015) 75%, transparent 100%)",
        }}
      />

      {/* 1c. Tight Near Core Rim Glow (Illuminated Rim Aura) */}
      <div
        className="absolute top-3 left-1/2 -translate-x-1/2 w-[70%] sm:w-[62%] h-[140px] sm:h-[200px] rounded-full blur-[16px] sm:blur-[22px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, var(--ring-glow-near) 0%, rgba(139, 92, 246, 0.28) 25%, rgba(139, 92, 246, 0.10) 55%, transparent 80%)",
        }}
      />

      {/* 1d. Ultra-Subtle Dither / Noise Overlay (Disrupts 8-bit quantization banding on all panels) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none -z-10 opacity-[0.025]"
        aria-hidden="true"
      >
        <filter id="antiBandingDither">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.25 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#antiBandingDither)" />
      </svg>

      {/* 2. Rotating 3D Orbital Plane Container (Elliptical Perspective: 46deg desktop, 40deg mobile) */}
      <div
        className="w-full h-full flex items-start justify-center will-change-transform"
        style={{
          transform: isMobile
            ? "perspective(900px) rotateX(40deg) rotateZ(0deg)"
            : `perspective(1000px) rotateX(46deg) rotateZ(${rotation}deg)`,
          transformOrigin: "50% 65%",
        }}
      >
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 1200 560"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            {/* Dark Mode Outer Rim Gradient: Localized Apex Highlight with Smooth Violet Shoulders */}
            <linearGradient id="oxidArcRimDark" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6d28d9" stopOpacity="0" />
              <stop offset="12%" stopColor="#7c3aed" stopOpacity="0.45" />
              <stop offset="28%" stopColor="#8b5cf6" stopOpacity="0.85" />
              <stop offset="44%" stopColor="#c4b5fd" stopOpacity="0.98" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="56%" stopColor="#c4b5fd" stopOpacity="0.98" />
              <stop offset="72%" stopColor="#8b5cf6" stopOpacity="0.85" />
              <stop offset="88%" stopColor="#7c3aed" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
            </linearGradient>

            {/* Light Mode Outer Rim Gradient: Crisp Royal Indigo/Violet */}
            <linearGradient id="oxidArcRimLight" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" stopOpacity="0" />
              <stop offset="15%" stopColor="#4f46e5" stopOpacity="0.65" />
              <stop offset="35%" stopColor="#6366f1" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#4338ca" stopOpacity="1" />
              <stop offset="65%" stopColor="#6366f1" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#4f46e5" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
            </linearGradient>

            {/* Dark Mode Inner Edge Shade: Darker Violet-Obsidian Bevel */}
            <linearGradient id="oxidArcInnerDark" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0" />
              <stop offset="20%" stopColor="#2e1065" stopOpacity="0.80" />
              <stop offset="50%" stopColor="#150d30" stopOpacity="0.98" />
              <stop offset="80%" stopColor="#2e1065" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
            </linearGradient>

            {/* Light Mode Inner Edge Shade: Soft Slate Gray-Violet */}
            <linearGradient id="oxidArcInnerLight" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0" />
              <stop offset="25%" stopColor="#94a3b8" stopOpacity="0.70" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.90" />
              <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.70" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>

            {/* Dark Mode Physical Ring Body: Substantial Graphite Metallic with Luminous Lavender Underglow */}
            <radialGradient id="ringBodyDark" cx="50%" cy="5%" r="85%">
              <stop offset="0%" stopColor="#4c4475" stopOpacity="0.98" />
              <stop offset="18%" stopColor="#353054" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#222036" stopOpacity="0.90" />
              <stop offset="70%" stopColor="#151422" stopOpacity="0.60" />
              <stop offset="90%" stopColor="#0f0f18" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#0a0a10" stopOpacity="0" />
            </radialGradient>

            {/* Light Mode Physical Ring Body: Architectural Silver & Platinum Sheen with Soft Horizon Fade */}
            <radialGradient id="ringBodyLight" cx="50%" cy="5%" r="85%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="18%" stopColor="#f8fafc" stopOpacity="0.95" />
              <stop offset="42%" stopColor="#e2e8f0" stopOpacity="0.90" />
              <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.60" />
              <stop offset="90%" stopColor="#94a3b8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
            </radialGradient>

            {/* Dual-Level Rim Glow Filter: Tight Near (12px) + Wide Far (36px) */}
            <filter id="ringRimGlow" x="-25%" y="-50%" width="150%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="nearBlur" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="36" result="farBlur" />
              <feMerge>
                <feMergeNode in="farBlur" opacity="0.38" />
                <feMergeNode in="nearBlur" opacity="0.75" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. PHYSICAL RING BODY — Substantial Dimensional Surface (~130px thick in coordinate space) */}
          {/* Light Mode Physical Body */}
          <path
            className="dark:hidden"
            d="M 40 560 C 170 190, 370 32, 600 32 C 830 32, 1030 190, 1160 560 L 1090 560 C 970 240, 790 162, 600 162 C 410 162, 230 240, 110 560 Z"
            fill="url(#ringBodyLight)"
          />
          {/* Dark Mode Physical Body */}
          <path
            className="hidden dark:block"
            d="M 40 560 C 170 190, 370 32, 600 32 C 830 32, 1030 190, 1160 560 L 1090 560 C 970 240, 790 162, 600 162 C 410 162, 230 240, 110 560 Z"
            fill="url(#ringBodyDark)"
          />

          {/* 2. DUAL-EDGE ARCHITECTURE: INNER SHADE (Dimensional Bevel) */}
          {/* Light Mode Inner Shade */}
          <path
            className="dark:hidden"
            d="M 110 560 C 230 240, 410 162, 600 162 C 790 162, 970 240, 1090 560"
            stroke="url(#oxidArcInnerLight)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Dark Mode Inner Shade */}
          <path
            className="hidden dark:block"
            d="M 110 560 C 230 240, 410 162, 600 162 C 790 162, 970 240, 1090 560"
            stroke="url(#oxidArcInnerDark)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 3. CONCENTRIC MID-BODY ARCHITECTURAL GROOVE (Machined Seam for 3D Tangibility) */}
          {/* Light Mode Groove */}
          <path
            className="dark:hidden"
            d="M 75 560 C 200 215, 390 96, 600 96 C 810 96, 1000 215, 1125 560"
            stroke="rgba(99, 102, 241, 0.22)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Dark Mode Groove */}
          <path
            className="hidden dark:block"
            d="M 75 560 C 200 215, 390 96, 600 96 C 810 96, 1000 215, 1125 560"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* 4. PRECISION GRADUATION TICKS — Instrument Aesthetic Etched on Surface */}
          <g className="text-violet-600/60 dark:text-violet-300/75">
            {ticks.map((t, idx) => (
              <line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity={idx === 4 ? 1 : 0.75}
              />
            ))}
          </g>

          {/* 5. SUBTLE INNER CHAMFER SPECULAR HIGHLIGHT (Machined Bevel Line) */}
          <path
            className="hidden dark:block"
            d="M 55 560 C 180 198, 375 44, 600 44 C 825 44, 1020 198, 1145 560"
            stroke="rgba(255, 255, 255, 0.24)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* 6. DUAL-EDGE ARCHITECTURE: OUTER BRIGHT RIM WITH DUAL GLOW */}
          {/* Light Mode Outer Rim */}
          <path
            className="dark:hidden"
            d="M 40 560 C 170 190, 370 32, 600 32 C 830 32, 1030 190, 1160 560"
            stroke="url(#oxidArcRimLight)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#ringRimGlow)"
          />
          {/* Dark Mode Outer Rim */}
          <path
            className="hidden dark:block"
            d="M 40 560 C 170 190, 370 32, 600 32 C 830 32, 1030 190, 1160 560"
            stroke="url(#oxidArcRimDark)"
            strokeWidth="4.5"
            strokeLinecap="round"
            filter="url(#ringRimGlow)"
          />

          {/* 7. LOCALIZED CINEMATIC SPECULAR CROWN GLINT (Biased to 11 o'clock) */}
          {/* Dark Mode Crown Glint */}
          <ellipse
            className="hidden dark:block"
            cx="580"
            cy="34"
            rx="140"
            ry="8"
            fill="#ede9fe"
            opacity="0.45"
            filter="url(#ringRimGlow)"
          />
          {/* Light Mode Crown Glint */}
          <ellipse
            className="dark:hidden"
            cx="580"
            cy="34"
            rx="140"
            ry="7"
            fill="#4338ca"
            opacity="0.30"
            filter="url(#ringRimGlow)"
          />
        </svg>
      </div>
    </div>
  );
}
