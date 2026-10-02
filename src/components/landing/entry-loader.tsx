"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Terminal, ShieldCheck, Zap } from "lucide-react";

const STORAGE_KEY = "oxid_intro_seen";
const emptySubscribe = () => () => {};

export function EntryLoader() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(12);
  const [statusText, setStatusText] = useState("MEMPERSIAPKAN SISTEM...");

  useEffect(() => {
    try {
      const alreadySeen = sessionStorage.getItem(STORAGE_KEY);
      if (alreadySeen) {
        return;
      }
    } catch {
      // Storage unavailable, ignore
    }

    const timeouts: NodeJS.Timeout[] = [];

    const startTimer = setTimeout(() => {
      setVisible(true);
    }, 10);
    timeouts.push(startTimer);

    const steps = [
      { t: 250, p: 38, text: "MEMVERIFIKASI PROTOKOL LEDGER..." },
      { t: 650, p: 72, text: "MENGHUBUNGKAN MESIN TELEGRAM..." },
      { t: 1050, p: 95, text: "MENYIAPKAN PANEL KONTROL..." },
      { t: 1350, p: 100, text: "SISTEM SIAP DIGUNAKAN" },
    ];

    steps.forEach((step) => {
      const timer = setTimeout(() => {
        setProgress(step.p);
        setStatusText(step.text);
      }, step.t);
      timeouts.push(timer);
    });

    const fadeTimer = setTimeout(() => {
      setFading(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Storage unavailable, ignore
      }
    }, 1500);
    timeouts.push(fadeTimer);

    const endTimer = setTimeout(() => {
      setVisible(false);
    }, 1850);
    timeouts.push(endTimer);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFading(true);
        try {
          sessionStorage.setItem(STORAGE_KEY, "1");
        } catch {
          // Storage unavailable
        }
        setTimeout(() => setVisible(false), 200);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSkip = () => {
    setFading(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage unavailable
    }
    setTimeout(() => setVisible(false), 200);
  };

  if (!mounted || !visible) {
    return null;
  }

  return (
    <aside
      aria-label="Status Inisialisasi Sistem"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl transition-opacity duration-300 select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Matrix/Grid Overlay */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary-subtle)_0%,transparent_70%)] pointer-events-none opacity-40"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,var(--border-subtle)_1px,transparent_1px),linear-gradient(to_bottom,var(--border-subtle)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center text-center">
        {/* Futuristic Core Badge */}
        <div className="relative mb-6">
          <div className="h-16 w-16 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-lg relative overflow-hidden group">
            {/* Radar / Scan line sweep */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
              aria-hidden="true"
            />
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-fg font-black text-lg flex items-center justify-center tracking-tighter shadow-md">
              OX
            </div>
          </div>
          {/* Status Ping */}
          <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-1.5 text-xs font-mono tracking-widest text-muted uppercase mb-1">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>OXID CORE ENGINE</span>
          <span className="text-[10px] px-1 py-0.5 rounded bg-surface-hover border border-border text-foreground font-semibold">
            v2.4
          </span>
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-4">
          Sistem Pembukuan Transaksi UMKM
        </h2>

        {/* Telemetry Progress Bar */}
        <div className="w-full bg-surface-hover border border-border rounded-full h-1.5 overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full shadow-[0_0_8px_var(--primary)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="flex items-center justify-between w-full text-[11px] font-mono text-muted mb-6">
          <span className="truncate pr-2">{statusText}</span>
          <span className="font-semibold text-foreground shrink-0">{progress}%</span>
        </div>

        {/* Security & System Tags */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted border-t border-border pt-4">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>RLS ISOLATED</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            <span>ZERO LATENCY</span>
          </div>
        </div>

        {/* Skip action */}
        <button
          type="button"
          onClick={handleSkip}
          className="mt-6 text-[11px] text-muted hover:text-foreground font-mono transition-colors underline decoration-border hover:decoration-foreground underline-offset-4 cursor-pointer"
        >
          Lewati (Esc)
        </button>
      </div>
    </aside>
  );
}
