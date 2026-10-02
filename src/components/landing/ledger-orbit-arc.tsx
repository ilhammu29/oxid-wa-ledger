"use client";

import React from "react";

interface LedgerOrbitArcProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * "Ledger Orbit" Atmospheric Arc
 * An original OXID celestial visual motif inspired by RedSun's illuminated planetary curvature.
 * Features a glowing violet-indigo rim, atmospheric bloom, and deep graphite shading.
 */
export function LedgerOrbitArc({ className = "", style = {} }: LedgerOrbitArcProps) {
  return (
    <div
      className={`relative w-full max-w-[1280px] h-[340px] sm:h-[480px] lg:h-[620px] pointer-events-none select-none flex items-end justify-center overflow-visible ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* 1. Deep Celestial Atmospheric Bloom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] h-[260px] sm:h-[400px] lg:h-[500px] rounded-full blur-[70px] sm:blur-[100px] opacity-75 dark:opacity-85 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(124, 58, 237, 0.45) 0%, rgba(79, 70, 229, 0.25) 45%, rgba(15, 23, 42, 0) 80%)",
        }}
      />

      {/* 2. Secondary Indigo Horizon Shading */}
      <div
        className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[110%] h-[280px] sm:h-[420px] rounded-full blur-[50px] opacity-40 dark:opacity-50 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 90%, rgba(99, 102, 241, 0.3) 0%, rgba(67, 56, 202, 0.15) 50%, transparent 80%)",
        }}
      />

      {/* 3. High-Precision Curvature SVG Arc & Specular Rim */}
      <svg
        className="w-full h-full overflow-visible"
        viewBox="0 0 1200 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          {/* Arc Gradient: Pure Violet to Soft Indigo to Fade */}
          <linearGradient id="oxidArcRim" x1="0%" y1="100%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
            <stop offset="20%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="42%" stopColor="#c4b5fd" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="58%" stopColor="#c4b5fd" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>

          {/* Core Body Gradient: Deep Shaded Planetary Sphere */}
          <radialGradient id="oxidPlanetBody" cx="50%" cy="115%" r="65%">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#0f111a" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#090a0f" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#090a0f" stopOpacity="0" />
          </radialGradient>

          {/* Rim Glow Filter */}
          <filter id="arcGlow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="18" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Planet Arc Body Fill */}
        <path
          d="M 60 500 Q 600 -40 1140 500 Z"
          fill="url(#oxidPlanetBody)"
        />

        {/* Glowing Rim Trace 1 (Wide Halo) */}
        <path
          d="M 80 500 Q 600 -35 1120 500"
          stroke="url(#oxidArcRim)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.6"
          filter="url(#arcGlow)"
        />

        {/* Glowing Rim Trace 2 (Crisp Specular Edge) */}
        <path
          d="M 120 500 Q 600 -30 1080 500"
          stroke="url(#oxidArcRim)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* Center Specular Crown Reflection */}
        <ellipse
          cx="600"
          cy="-20"
          rx="140"
          ry="12"
          fill="#ffffff"
          opacity="0.4"
          filter="url(#arcGlow)"
        />
      </svg>
    </div>
  );
}
