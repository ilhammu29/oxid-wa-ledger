"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "oxid_intro_seen";
const emptySubscribe = () => () => {};

export function EntryLoader() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(15);

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
      { t: 200, p: 45 },
      { t: 550, p: 80 },
      { t: 950, p: 100 },
    ];

    steps.forEach((step) => {
      const timer = setTimeout(() => {
        setProgress(step.p);
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
    }, 1250);
    timeouts.push(fadeTimer);

    const endTimer = setTimeout(() => {
      setVisible(false);
    }, 1650);
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
      aria-label="Status Memuat OXID Ledger"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-400 ease-out select-none ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative z-10 w-full max-w-xs px-6 flex flex-col items-center text-center">
        {/* Monogram Brand */}
        <div className="h-10 w-10 rounded-xl bg-primary text-primary-fg font-bold text-sm flex items-center justify-center shadow-xs mb-4">
          OX
        </div>

        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-1">
          OXID Ledger
        </h2>
        <p className="text-xs text-muted mb-4">
          Menyiapkan pengalaman Anda...
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-surface border border-border rounded-full h-1 overflow-hidden mb-3">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="text-[11px] text-muted hover:text-foreground font-mono transition-colors underline decoration-border hover:decoration-foreground underline-offset-4 cursor-pointer"
        >
          Lewati (Esc)
        </button>
      </div>
    </aside>
  );
}
