"use client";

import React from "react";

interface LedgerOrbitArcProps {
  className?: string;
  style?: React.CSSProperties;
  rotation?: number; // Scroll-driven rotation angle in degrees (e.g. 0 to 65)
}

/**
 * "Ledger Orbit" Atmospheric Arc — Visibility & Material Polish Pass
 * An original OXID celestial visual motif inspired by RedSun's illuminated planetary curvature.
 * Features:
 * - Clear physical ring body (~90px thick surface in graphite/charcoal metallic in dark mode, platinum/silver in light mode).
 * - Dual-edge 3D architecture: bright illuminated outer rim + dark inner bevel shade.
 * - Localized cinematic highlight: stronger luminance at top crest (slightly biased to 11 o'clock).
 * - Two-level glow: tight near glow (14px) + wide soft far glow (40px). Zero hero fogging.
 * - Dynamic scroll-driven 3D orbital plane rotation (rotateZ + 52deg perspective tilt, NO autoplay spin).
 * - Theme-aware tokens: completely decoupled light and dark mode appearance.
 * - Precision graduation ticks along the perimeter for high-end instrument aesthetic.
 */
export function LedgerOrbitArc({
  className = "",
  style = {},
  rotation = 0,
}: LedgerOrbitArcProps) {
  // Precision ticks along the celestial arc (11 mathematically calculated normal coordinates)
  const ticks = [
    { x1: 170, y1: 333, x2: 187, y2: 343 },
    { x1: 246, y1: 228, x2: 261, y2: 241 },
    { x1: 327, y1: 148, x2: 340, y2: 163 },
    { x1: 414, y1: 92, x2: 423, y2: 110 },
    { x1: 505, y1: 59, x2: 510, y2: 78 },
    { x1: 600, y1: 48, x2: 600, y2: 68 },
    { x1: 695, y1: 59, x2: 690, y2: 78 },
    { x1: 786, y1: 92, x2: 777, y2: 110 },
    { x1: 873, y1: 148, x2: 860, y2: 163 },
    { x1: 954, y1: 228, x2: 939, y2: 241 },
    { x1: 1030, y1: 333, x2: 1013, y2: 343 },
  ];

  return (
    <div
      className={`relative w-full max-w-[1340px] h-[340px] sm:h-[460px] lg:h-[560px] pointer-events-none select-none flex items-start justify-center overflow-visible ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. Subtle Localized Background Separation Lift (Directly under ring apex) */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-[90%] sm:w-[80%] h-[300px] sm:h-[400px] pointer-events-none -z-20 transition-opacity duration-300"
        style={{
          background: "var(--ring-separation-gradient)",
        }}
      />

      {/* 2. Dual-Level Ambient Glow (Near & Far) */}
      {/* 2a. Wide Far Glow (Atmospheric Horizon Blur) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[94%] sm:w-[88%] h-[280px] sm:h-[380px] rounded-full blur-[60px] sm:blur-[80px] pointer-events-none -z-10"
        style={{
          background: "radial-gradient(ellipse at 50% 25%, var(--ring-glow-far) 0%, transparent 75%)",
        }}
      />

      {/* 2b. Tight Near Glow (Illuminated Rim Aura) */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 w-[74%] sm:w-[68%] h-[160px] sm:h-[220px] rounded-full blur-[18px] sm:blur-[24px] pointer-events-none -z-10"
        style={{
          background: "radial-gradient(ellipse at 50% 22%, var(--ring-glow-near) 0%, transparent 70%)",
        }}
      />

      {/* 3. Rotating 3D Orbital Plane Container (Elliptical Perspective at 52deg) */}
      <div
        className="w-full h-full flex items-start justify-center will-change-transform"
        style={{
          transform: `perspective(1000px) rotateX(52deg) rotateZ(${rotation}deg)`,
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
            {/* Dark Mode Outer Rim Gradient: Localized Apex Highlight */}
            <linearGradient id="oxidArcRimDark" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
              <stop offset="15%" stopColor="#8b5cf6" stopOpacity="0.65" />
              <stop offset="30%" stopColor="#a78bfa" stopOpacity="0.90" />
              <stop offset="46%" stopColor="#ddd6fe" stopOpacity="0.98" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="54%" stopColor="#ddd6fe" stopOpacity="0.98" />
              <stop offset="70%" stopColor="#a78bfa" stopOpacity="0.90" />
              <stop offset="85%" stopColor="#8b5cf6" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>

            {/* Light Mode Outer Rim Gradient: Crisp Royal Indigo/Violet */}
            <linearGradient id="oxidArcRimLight" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" stopOpacity="0" />
              <stop offset="15%" stopColor="#6366f1" stopOpacity="0.75" />
              <stop offset="35%" stopColor="#6d28d9" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#4338ca" stopOpacity="1" />
              <stop offset="65%" stopColor="#6d28d9" stopOpacity="0.95" />
              <stop offset="85%" stopColor="#6366f1" stopOpacity="0.75" />
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
              <stop offset="25%" stopColor="#94a3b8" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#475569" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#94a3b8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>

            {/* Dark Mode Physical Ring Body: Rich Graphite Metallic with Lavender Sheen & Soft Horizon Fade */}
            <radialGradient id="ringBodyDark" cx="50%" cy="8%" r="75%">
              <stop offset="0%" stopColor="#433d6b" stopOpacity="0.98" />
              <stop offset="25%" stopColor="#2e2b48" stopOpacity="0.96" />
              <stop offset="55%" stopColor="#1e1d2c" stopOpacity="0.90" />
              <stop offset="80%" stopColor="#14131e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#14131e" stopOpacity="0" />
            </radialGradient>

            {/* Light Mode Physical Ring Body: Pearlescent Platinum & Architectural Silver with Soft Horizon Fade */}
            <radialGradient id="ringBodyLight" cx="50%" cy="8%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
              <stop offset="25%" stopColor="#f1f5f9" stopOpacity="0.96" />
              <stop offset="55%" stopColor="#e2e8f0" stopOpacity="0.90" />
              <stop offset="80%" stopColor="#cbd5e1" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
            </radialGradient>

            {/* Dual-Level Rim Glow Filter: Tight Near (14px) + Wide Far (40px) */}
            <filter id="ringRimGlow" x="-25%" y="-50%" width="150%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="nearBlur" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="farBlur" />
              <feMerge>
                <feMergeNode in="farBlur" opacity="0.4" />
                <feMergeNode in="nearBlur" opacity="0.75" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. PHYSICAL RING BODY — Clearly Distinguishable Dimensional Surface (~90px thick) */}
          {/* Light Mode Physical Body */}
          <path
            className="dark:hidden"
            d="M 50 560 C 180 200, 380 36, 600 36 C 820 36, 1020 200, 1150 560 L 1100 560 C 980 230, 800 126, 600 126 C 400 126, 220 230, 100 560 Z"
            fill="url(#ringBodyLight)"
          />
          {/* Dark Mode Physical Body */}
          <path
            className="hidden dark:block"
            d="M 50 560 C 180 200, 380 36, 600 36 C 820 36, 1020 200, 1150 560 L 1100 560 C 980 230, 800 126, 600 126 C 400 126, 220 230, 100 560 Z"
            fill="url(#ringBodyDark)"
          />

          {/* 2. DUAL-EDGE ARCHITECTURE: INNER SHADE (Dimensional Bevel) */}
          {/* Light Mode Inner Shade */}
          <path
            className="dark:hidden"
            d="M 100 560 C 220 230, 400 126, 600 126 C 800 126, 980 230, 1100 560"
            stroke="url(#oxidArcInnerLight)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Dark Mode Inner Shade */}
          <path
            className="hidden dark:block"
            d="M 100 560 C 220 230, 400 126, 600 126 C 800 126, 980 230, 1100 560"
            stroke="url(#oxidArcInnerDark)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 3. PRECISION GRADUATION TICKS — Instrument Aesthetic Etched on Surface */}
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
                opacity={idx === 5 ? 1 : 0.75}
              />
            ))}
          </g>

          {/* 4. SUBTLE INNER CHAMFER SPECULAR HIGHLIGHT (Machined Bevel Line) */}
          <path
            className="hidden dark:block"
            d="M 65 560 C 190 206, 385 48, 600 48 C 815 48, 1010 206, 1135 560"
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* 5. DUAL-EDGE ARCHITECTURE: OUTER BRIGHT RIM WITH DUAL GLOW */}
          {/* Light Mode Outer Rim */}
          <path
            className="dark:hidden"
            d="M 50 560 C 180 200, 380 36, 600 36 C 820 36, 1020 200, 1150 560"
            stroke="url(#oxidArcRimLight)"
            strokeWidth="4"
            strokeLinecap="round"
            filter="url(#ringRimGlow)"
          />
          {/* Dark Mode Outer Rim */}
          <path
            className="hidden dark:block"
            d="M 50 560 C 180 200, 380 36, 600 36 C 820 36, 1020 200, 1150 560"
            stroke="url(#oxidArcRimDark)"
            strokeWidth="4.5"
            strokeLinecap="round"
            filter="url(#ringRimGlow)"
          />

          {/* 6. LOCALIZED CINEMATIC SPECULAR CROWN GLINT (Biased to 11 o'clock) */}
          {/* Dark Mode Crown Glint */}
          <ellipse
            className="hidden dark:block"
            cx="580"
            cy="38"
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
            cy="38"
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
