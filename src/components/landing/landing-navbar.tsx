"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";

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
    { label: "Integrasi", href: "#integrasi" },
    { label: "Harga", href: "#harga" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "border-b border-border bg-background/85 backdrop-blur-md shadow-xs"
          : "border-b border-border/40 bg-background/40 backdrop-blur-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Left */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <BrandLogo size="md" showText priority className="transition-transform group-hover:scale-102" />
        </Link>

        {/* Center Plain Text Navigation (Desktop) - No numbered tags */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-muted"
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
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle showLabel={false} />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-9 px-3.5 text-xs font-semibold text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Masuk
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Mulai Gratis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground transition-colors cursor-pointer"
            aria-expanded={mobileMenuOpen}
            aria-label="Menu navigasi"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface/98 backdrop-blur-md px-4 py-5 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-3 pb-4 border-b border-border text-sm">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-muted hover:text-foreground transition-colors py-1.5 font-medium"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 flex flex-col gap-2.5">
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
              className="w-full text-center py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
            >
              {isAuthenticated ? "Buka Dashboard" : "Mulai Gratis 14 Hari"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
