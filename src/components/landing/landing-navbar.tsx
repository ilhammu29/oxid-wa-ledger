"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

interface LandingNavbarProps {
  isAuthenticated: boolean;
}

export function LandingNavbar({ isAuthenticated }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { num: "01", label: "Alur Transaksi", href: "#alur-transaksi" },
    { num: "02", label: "Konsol Ledger", href: "#konsol-produk" },
    { num: "03", label: "Kemampuan", href: "#kemampuan" },
    { num: "04", label: "Paket Harga", href: "#harga" },
    { num: "05", label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-200 ${
        isScrolled
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "border-b border-border/40 bg-background/50 backdrop-blur-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand Left */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
            OX
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-foreground tracking-tight text-sm leading-none">
              OXID Ledger
            </span>
            <span className="text-[10px] text-muted font-mono tracking-tight mt-0.5 hidden sm:block">
              Buku Kas Operasional
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-muted"
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-foreground transition-colors flex items-center gap-1.5 py-1"
            >
              <span className="text-[10px] font-mono text-muted/70">{item.num}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle showLabel={false} />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-8 sm:h-9 px-3 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Masuk
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 sm:px-4 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Coba 14 Hari</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              </Link>
            </>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label="Buka menu navigasi"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface/98 backdrop-blur-md px-4 py-4 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-3 pb-3 border-b border-border text-sm">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted hover:text-foreground transition-colors py-1 flex items-center justify-between"
              >
                <span>{item.label}</span>
                <span className="text-xs font-mono text-muted/60">{item.num}</span>
              </a>
            ))}
          </nav>
          <div className="pt-3 flex flex-col gap-2">
            {!isAuthenticated && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-colors"
              >
                Masuk ke Akun
              </Link>
            )}
            <Link
              href={isAuthenticated ? "/dashboard" : "/signup"}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg text-xs font-semibold shadow-xs transition-colors"
            >
              {isAuthenticated ? "Buka Dashboard" : "Mulai Coba 14 Hari"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
