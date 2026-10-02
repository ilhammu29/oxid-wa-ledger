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
    { label: "Fitur", href: "#fitur" },
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Alur Sistem", href: "#alur" },
    { label: "Harga", href: "#harga" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md shadow-xs"
          : "border-b border-transparent bg-background/30 backdrop-blur-xs"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
        {/* Brand Left */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
            OX
          </div>
          <span className="font-bold text-foreground tracking-tight text-sm sm:text-base">
            OXID Ledger
          </span>
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
              className="hover:text-foreground transition-colors py-1"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <ThemeToggle showLabel={false} />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-fg text-xs font-medium shadow-xs hover:opacity-95 transition"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-8 px-3 text-xs font-medium text-muted hover:text-foreground transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-primary text-primary-fg text-xs font-medium shadow-xs hover:opacity-95 transition"
              >
                <span>Mulai Gratis</span>
                <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
              </Link>
            </>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-medium text-muted hover:text-foreground py-1.5"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {!isAuthenticated && (
            <div className="pt-2 border-t border-border flex items-center gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                Masuk ke Akun
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
