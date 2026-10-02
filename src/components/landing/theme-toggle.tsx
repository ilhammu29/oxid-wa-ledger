"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const emptySubscribe = () => () => {};

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-lg border border-border bg-surface-hover ${className}`}
        aria-hidden="true"
      />
    );
  }

  const label =
    theme === "system"
      ? "Sistem"
      : resolvedTheme === "dark"
      ? "Gelap"
      : "Terang";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground text-xs font-medium transition-colors ${className}`}
      aria-label={`Ubah tema tampilan. Saat ini: ${label}`}
      title={`Tema: ${label} (Klik untuk beralih)`}
    >
      {theme === "system" ? (
        <Laptop className="w-3.5 h-3.5 shrink-0" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Sun className="w-3.5 h-3.5 shrink-0" />
      )}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
