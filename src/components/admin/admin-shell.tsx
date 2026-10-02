"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  CreditCard,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AdminNav } from "./admin-nav";
import { AdminCommandPalette } from "./admin-command-palette";
import { useTheme } from "@/components/theme/theme-provider";

interface AdminShellProps {
  userEmail: string;
  adminRole: string;
  healthyServicesCount?: number;
  totalServicesCount?: number;
  pendingPaymentsCount?: number;
  children: React.ReactNode;
}

const SIDEBAR_WIDTH_EXPANDED = "224px";
const SIDEBAR_WIDTH_COLLAPSED = "64px";

export function AdminShell({
  userEmail,
  adminRole,
  healthyServicesCount = 5,
  totalServicesCount = 6,
  pendingPaymentsCount = 0,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Responsive default: expanded >= 1280px, collapsed 768–1279px
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("oxid_admin_sidebar_collapsed");
        if (saved !== null) {
          return saved === "true";
        }
        return window.innerWidth < 1280;
      } catch {
        // Ignore storage errors
      }
    }
    return false;
  });

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("oxid_admin_sidebar_collapsed", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Keyboard shortcut for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle responsive resize boundaries (768px, 1280px)
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 1280 && w >= 768) {
        setIsCollapsed(true);
      } else if (w >= 1280) {
        try {
          const saved = localStorage.getItem("oxid_admin_sidebar_collapsed");
          if (saved === null) {
            setIsCollapsed(false);
          }
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile drawer on ESC and trap body scroll
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileDrawerOpen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileDrawerOpen]);

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin",
    support_admin: "Support Admin",
    billing_admin: "Billing Admin",
    viewer: "Viewer",
  };

  const getPageTitle = () => {
    if (pathname === "/admin") return "Overview";
    if (pathname.startsWith("/admin/businesses")) return "Bisnis Klien";
    if (pathname.startsWith("/admin/users")) return "Pengguna & Admin";
    if (pathname.startsWith("/admin/subscriptions")) return "Langganan SaaS";
    if (pathname.startsWith("/admin/payments")) return "Konfirmasi Bayar";
    if (pathname.startsWith("/admin/system")) return "Status Sistem";
    if (pathname.startsWith("/admin/audit")) return "Audit Trail";
    if (pathname.startsWith("/admin/settings")) return "Pengaturan Tagihan";
    return "Control Center";
  };

  const currentSidebarWidth = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col relative"
      style={{
        ["--admin-sidebar-width" as string]: currentSidebarWidth,
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP / TABLET SIDEBAR (Fixed 100dvh viewport shell)
          - Hidden on mobile < 768px (display: none)
          - Width: 64px (collapsed icon rail) or 224px (expanded)
          - Physically fixed to viewport (position: fixed; top: 0; bottom: 0; left: 0; height: 100dvh)
          - Does NOT couple with main document scroll
          - Background and right border span 100dvh at all times
      ────────────────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed top-0 bottom-0 left-0 h-dvh flex-col border-r border-border bg-card z-30 transition-[width] duration-200 overflow-hidden"
        style={{
          width: "var(--admin-sidebar-width)",
        }}
      >
        {/* Brand Header (Pinned at top of sidebar) */}
        <div
          className={`h-14 shrink-0 px-3 flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          } border-b border-border/80 bg-card`}
        >
          <Link
            href="/admin"
            className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"} overflow-hidden select-none`}
            title="OXID Admin Control Center"
          >
            <BrandLogo size="sm" showText={false} />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-xs tracking-tight text-foreground">OXID</span>
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                    ADMIN
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Control Center</p>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              title="Ciutkan Sidebar"
              aria-label="Ciutkan Sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Navigation Area (Independent internal flex scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2">
          <AdminNav
            isCollapsed={isCollapsed}
            pendingPaymentsCount={pendingPaymentsCount}
          />
        </div>

        {/* Fixed Footer (Pinned at bottom of sidebar viewport, never scrolls) */}
        <div className="shrink-0 mt-auto p-2 border-t border-border/80 space-y-1.5 bg-card">
          {!isCollapsed ? (
            <>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                <div className="flex items-center justify-between gap-1.5 mb-1 min-w-0">
                  <span
                    className="text-[11px] font-mono text-foreground font-medium truncate min-w-0 flex-1"
                    title={userEmail}
                  >
                    {userEmail}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase shrink-0">
                    {roleLabelMap[adminRole] || adminRole}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">Operator Platform</span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Ke Dashboard Usaha"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Ke Dashboard Usaha</span>
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {/* Collapsed Operator Badge Icon */}
              <div
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl bg-muted/40 text-primary"
                title={`${userEmail} (${roleLabelMap[adminRole] || adminRole})`}
                aria-label={`Operator: ${userEmail}`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>

              {/* Collapsed Back to Merchant Dashboard */}
              <Link
                href="/dashboard"
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Ke Dashboard Usaha"
                aria-label="Ke Dashboard Usaha"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
              </Link>

              {/* Collapsed Expand Toggle Button */}
              <button
                onClick={toggleSidebar}
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                title="Buka Sidebar"
                aria-label="Buka Sidebar"
              >
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE DRAWER SHEET (Screen width < 768px)
          - Full accessible dialog drawer
          - Closes on Escape, overlay click, or link click
      ────────────────────────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Admin"
            className="w-72 max-w-[85vw] h-dvh max-h-dvh bg-card border-r border-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <BrandLogo size="sm" showText={false} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs tracking-tight text-foreground">OXID</span>
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Control Center</p>
                </div>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
                title="Tutup Menu"
                aria-label="Tutup Menu"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Drawer Navigation (Independent flex scroll) */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2">
              <AdminNav
                isCollapsed={false}
                onItemClick={() => setMobileDrawerOpen(false)}
                pendingPaymentsCount={pendingPaymentsCount}
              />
            </div>

            {/* Drawer Footer (Pinned at bottom of drawer) */}
            <div className="shrink-0 mt-auto p-3 border-t border-border space-y-2 bg-card">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between gap-1.5 mb-1 min-w-0">
                  <span className="text-[11px] font-mono text-foreground font-medium truncate min-w-0 flex-1">
                    {userEmail}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase shrink-0">
                    {roleLabelMap[adminRole] || adminRole}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">Platform Operator</span>
                </div>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ke Dashboard Usaha</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT CONTAINER & TOPBAR
          - Horizontal offset starts after fixed sidebar via margin-left
          - Zero offset on mobile (< 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full md:ml-[var(--admin-sidebar-width)] transition-[margin-left] duration-200">
        {/* Unified Topbar - Sticky top: 0, spanning only available main content */}
        <header className="sticky top-0 z-20 h-14 shrink-0 bg-card/90 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Mobile Toggle / Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none shrink-0 cursor-pointer"
              title="Buka Menu Admin"
              aria-label="Buka Menu Admin"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Link href="/admin" className="hover:text-foreground transition-colors font-medium shrink-0">
                Admin
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground truncate">{getPageTitle()}</span>
            </nav>
          </div>

          {/* Center: Command Palette Trigger Button (Responsive) */}
          <div className="flex items-center justify-center">
            {/* Desktop / Tablet Search Bar */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border text-xs text-muted-foreground transition-all hover:border-border/80 w-44 lg:w-64 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left truncate">Cari menu admin...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px] shrink-0">
                Ctrl K
              </kbd>
            </button>

            {/* Mobile Search Icon Trigger Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="sm:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
              title="Cari Menu Admin (Ctrl+K)"
              aria-label="Cari Menu Admin"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Operational Status + Theme Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick System Health Pill */}
            <Link
              href="/admin/system"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted border border-border text-[11px] font-medium transition-colors"
              title="Kesehatan Layanan Backend"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline text-muted-foreground">Sistem:</span>
              <span className="font-semibold text-foreground tabular-nums">
                {healthyServicesCount}/{totalServicesCount}
              </span>
            </Link>

            {/* Pending Payments Indicator */}
            {pendingPaymentsCount > 0 && (
              <Link
                href="/admin/payments"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[11px] font-bold transition-colors"
                title={`${pendingPaymentsCount} bukti bayar menunggu verifikasi`}
              >
                <CreditCard className="w-3 h-3 shrink-0" />
                <span>{pendingPaymentsCount} Bayar</span>
              </Link>
            )}

            {/* Theme Toggle Button */}
            <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/30">
              <button
                onClick={() => setTheme("light")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === "light"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mode Terang"
                aria-label="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === "dark"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mode Gelap"
                aria-label="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === "system"
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Ikuti Sistem"
                aria-label="Ikuti Sistem"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area (Safely padded, zero horizontal overflow) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full">
          {children}
        </main>
      </div>

      {/* Global Admin Command Palette Modal */}
      <AdminCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
