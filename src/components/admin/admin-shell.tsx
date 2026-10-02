"use client";

import { useState, useEffect } from "react";
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

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP / TABLET SIDEBAR (Hidden on mobile < 768px)
      ────────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-200 z-30 ${
          isCollapsed ? "w-16" : "w-56 lg:w-60"
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-border/80">
          <Link
            href="/admin"
            className="flex items-center gap-2 overflow-hidden select-none"
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

          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title={isCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2">
          <AdminNav
            isCollapsed={isCollapsed}
            pendingPaymentsCount={pendingPaymentsCount}
          />
        </div>

        {/* Admin User Footer Profile & Merchant Return */}
        <div className="p-2 border-t border-border/80 space-y-1.5">
          {!isCollapsed ? (
            <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className="text-[11px] font-mono text-foreground font-medium truncate max-w-[120px]"
                  title={userEmail}
                >
                  {userEmail}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase">
                  {roleLabelMap[adminRole] || adminRole}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3 text-primary" />
                <span>Operator Platform</span>
              </div>
            </div>
          ) : (
            <div
              className="flex justify-center p-2 rounded-xl bg-muted/40 text-primary"
              title={`${userEmail} (${roleLabelMap[adminRole] || adminRole})`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          )}

          <Link
            href="/dashboard"
            className={`flex items-center ${
              isCollapsed ? "justify-center p-2" : "gap-2 px-2.5 py-1.5"
            } rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors`}
            title="Ke Dashboard Merchant"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span className="truncate">Ke Dashboard Usaha</span>}
          </Link>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE DRAWER SHEET (Screen width < 768px)
      ────────────────────────────────────────────────────────────── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-card border-r border-border flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-border">
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
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Navigation */}
            <div className="flex-1 overflow-y-auto py-2">
              <AdminNav
                isCollapsed={false}
                onItemClick={() => setMobileDrawerOpen(false)}
                pendingPaymentsCount={pendingPaymentsCount}
              />
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border space-y-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-mono text-foreground font-medium truncate max-w-[140px]">
                    {userEmail}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                    {roleLabelMap[adminRole] || adminRole}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <UserCheck className="w-3 h-3 text-emerald-500" />
                  <span>Platform Operator</span>
                </div>
              </div>

              <Link
                href="/dashboard"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Ke Dashboard Merchant</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT CONTAINER WITH UNIFIED TOPBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Topbar */}
        <header className="sticky top-0 z-20 h-14 bg-card/90 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle + Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Buka Menu Admin"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Link href="/admin" className="hover:text-foreground transition-colors font-medium">
                Admin
              </Link>
              <span>/</span>
              <span className="font-semibold text-foreground truncate">{getPageTitle()}</span>
            </nav>
          </div>

          {/* Center: Command Palette Trigger Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border text-xs text-muted-foreground transition-all hover:border-border/80 w-52 md:w-64"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left truncate">Cari menu admin...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
              Ctrl K
            </kbd>
          </button>

          {/* Right: Operational Status + Theme + Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick System Health Pill */}
            <Link
              href="/admin/system"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted border border-border text-[11px] font-medium transition-colors"
              title="Kesehatan Layanan Backend"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="hidden sm:inline text-muted-foreground">Sistem:</span>
              <span className="font-semibold text-foreground">
                {healthyServicesCount}/{totalServicesCount}
              </span>
            </Link>

            {/* Pending Payments Indicator */}
            {pendingPaymentsCount > 0 && (
              <Link
                href="/admin/payments"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[11px] font-bold transition-colors"
                title={`${pendingPaymentsCount} bukti bayar menunggu verifikasi`}
              >
                <CreditCard className="w-3 h-3" />
                <span>{pendingPaymentsCount} Bayar</span>
              </Link>
            )}

            {/* Theme Toggle Button */}
            <div className="flex items-center border border-border rounded-xl p-0.5 bg-muted/30">
              <button
                onClick={() => setTheme("light")}
                className={`p-1 rounded-lg transition-colors ${
                  theme === "light"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mode Terang"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1 rounded-lg transition-colors ${
                  theme === "dark"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Mode Gelap"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1 rounded-lg transition-colors ${
                  theme === "system"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Ikuti Sistem"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
