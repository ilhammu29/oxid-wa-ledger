"use client";

import React from "react";

interface LedgerOrbitArcProps {
  className?: string;
  style?: React.CSSProperties;
  rotation?: number; // Scroll-driven rotation angle in degrees (e.g. 0 to 80)
}

/**
 * "Ledger Orbit" Atmospheric Arc — Root-Cause Rebuilt
 * An original OXID celestial visual motif inspired by RedSun's illuminated planetary curvature.
 * Features:
 * - Dynamic scroll-driven 3D orbital plane rotation (rotateZ + perspective tilt, NO autoplay spin).
 * - Full light & dark mode adaptation:
 *   - Dark: deep obsidian body, glowing violet/indigo rim, atmospheric bloom.
 *   - Light: luminous platinum/violet celestial arc, crisp contrast, zero dirty dark smudges.
 * - Precision graduation ticks along the perimeter for high-end instrument aesthetic.
 */
export function LedgerOrbitArc({
  className = "",
  style = {},
  rotation = 0,
}: LedgerOrbitArcProps) {
  // Precision ticks along the celestial arc (9 reference coordinates)
  const ticks = [
    { x1: 240, y1: 430, x2: 246, y2: 418 },
    { x1: 320, y1: 350, x2: 328, y2: 338 },
    { x1: 410, y1: 275, x2: 420, y2: 264 },
    { x1: 505, y1: 220, x2: 512, y2: 206 },
    { x1: 600, y1: 198, x2: 600, y2: 184 },
    { x1: 695, y1: 220, x2: 688, y2: 206 },
    { x1: 790, y1: 275, x2: 780, y2: 264 },
    { x1: 880, y1: 350, x2: 872, y2: 338 },
    { x1: 960, y1: 430, x2: 954, y2: 418 },
  ];

  return (
    <div
      className={`relative w-full max-w-[1280px] h-[340px] sm:h-[480px] lg:h-[620px] pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. Celestial Atmospheric Bloom (Theme-Aware) */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] h-[260px] sm:h-[400px] lg:h-[500px] rounded-full blur-[70px] sm:blur-[100px] opacity-40 dark:opacity-85 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(124, 58, 237, 0.35) 0%, rgba(99, 102, 241, 0.18) 45%, transparent 75%)",
        }}
      />

      {/* 2. Secondary Horizon Glow */}
      <div
        className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[110%] h-[280px] sm:h-[420px] rounded-full blur-[50px] opacity-25 dark:opacity-45 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 90%, rgba(139, 92, 246, 0.25) 0%, rgba(79, 70, 229, 0.12) 50%, transparent 80%)",
        }}
      />

      {/* 3. Rotating 3D Orbital Plane Container */}
      <div
        className="w-full h-full flex items-end justify-center will-change-transform"
        style={{
          transform: `perspective(1000px) rotateX(24deg) rotateZ(${rotation}deg)`,
          transformOrigin: "50% 88%",
        }}
      >
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 1200 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            {/* Dark Mode Rim Gradient */}
            <linearGradient id="oxidArcRimDark" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
              <stop offset="18%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#c4b5fd" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="60%" stopColor="#c4b5fd" stopOpacity="0.9" />
              <stop offset="82%" stopColor="#8b5cf6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>

            {/* Light Mode Rim Gradient */}
            <linearGradient id="oxidArcRimLight" x1="0%" y1="100%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
              <stop offset="18%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="40%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#4338ca" stopOpacity="1" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.9" />
              <stop offset="82%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>

            {/* Dark Mode Body Gradient: Deep Obsidian */}
            <radialGradient id="oxidPlanetBodyDark" cx="50%" cy="115%" r="65%">
              <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#0f111a" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#09090b" stopOpacity="0.98" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
            </radialGradient>

            {/* Light Mode Body Gradient: Pearlescent Slate/Lavender */}
            <radialGradient id="oxidPlanetBodyLight" cx="50%" cy="115%" r="65%">
              <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.75" />
              <stop offset="35%" stopColor="#f5f3ff" stopOpacity="0.55" />
              <stop offset="70%" stopColor="#f8fafc" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
            </radialGradient>

            {/* Rim Glow Filter */}
            <filter id="arcGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur1" />
              <feGaussianBlur stdDeviation="16" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Planet Body Fill — Theme Separated */}
          <path
            className="dark:hidden"
            d="M 60 500 Q 600 -40 1140 500 Z"
            fill="url(#oxidPlanetBodyLight)"
          />
          <path
            className="hidden dark:block"
            d="M 60 500 Q 600 -40 1140 500 Z"
            fill="url(#oxidPlanetBodyDark)"
          />

          {/* Precision Graduation Ticks along Curvature */}
          <g className="text-primary/40 dark:text-violet-400/50">
            {ticks.map((t, idx) => (
              <line
                key={idx}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity={0.65}
              />
            ))}
          </g>

          {/* Glowing Outer Halo (Wide Soft Rim) */}
          <path
            className="dark:hidden"
            d="M 80 500 Q 600 -35 1120 500"
            stroke="url(#oxidArcRimLight)"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.45"
            filter="url(#arcGlow)"
          />
          <path
            className="hidden dark:block"
            d="M 80 500 Q 600 -35 1120 500"
            stroke="url(#oxidArcRimDark)"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.6"
            filter="url(#arcGlow)"
          />

          {/* Glowing Inner Trace (Crisp Specular Edge) */}
          <path
            className="dark:hidden"
            d="M 120 500 Q 600 -30 1080 500"
            stroke="url(#oxidArcRimLight)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <path
            className="hidden dark:block"
            d="M 120 500 Q 600 -30 1080 500"
            stroke="url(#oxidArcRimDark)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Center Specular Crown Reflection */}
          <ellipse
            className="hidden dark:block"
            cx="600"
            cy="-20"
            rx="140"
            ry="12"
            fill="#ffffff"
            opacity="0.4"
            filter="url(#arcGlow)"
          />
          <ellipse
            className="dark:hidden"
            cx="600"
            cy="-20"
            rx="140"
            ry="10"
            fill="#7c3aed"
            opacity="0.25"
            filter="url(#arcGlow)"
          />
        </svg>
      </div>
    </div>
  );
}
