"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Package,
  CalendarCheck,
  LogOut,
  X,
  Plus,
  Activity,
  Bell,
  Radio,
  FileSpreadsheet,
  CreditCard,
  Search,
  Sun,
  Moon,
  Laptop,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { logoutAction } from "@/app/dashboard/actions";
import { CatatPenjualanModal } from "./catat-penjualan-modal";
import { CommandPalette } from "./command-palette";
import { useTheme } from "@/components/theme/theme-provider";

interface DashboardShellProps {
  business: {
    id: string;
    name: string;
    timezone: string;
    currency: string;
  };
  role: "owner" | "admin" | "member";
  userEmail: string;
  products: {
    id: string;
    name: string;
    unit: string;
    default_price: number;
    is_default: boolean;
    active: boolean;
  }[];
  subscriptionState?: {
    status: string;
    daysRemaining: number;
    isTrial: boolean;
  } | null;
  children: React.ReactNode;
}

export function DashboardShell({
  business,
  role,
  userEmail,
  products,
  subscriptionState,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("oxid_sidebar_collapsed") === "true";
      } catch {
        // Ignore storage errors
      }
    }
    return false;
  });
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("oxid_sidebar_collapsed", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
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

  // Navigation Items
  const primaryNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transaksi", href: "/dashboard/transactions", icon: Receipt },
    { name: "Produk", href: "/dashboard/products", icon: Package },
    { name: "Status Harian", href: "/dashboard/status", icon: CalendarCheck },
  ];

  const operationsNavItems = [
    { name: "Monitoring & Bot", href: "/dashboard/monitoring", icon: Activity },
    { name: "Pengingat Harian", href: "/dashboard/settings/reminders", icon: Bell },
    { name: "Kanal Pesan", href: "/dashboard/settings/channels", icon: Radio },
    { name: "Google Sheets", href: "/dashboard/settings/google-sheets", icon: FileSpreadsheet },
  ];

  const accountNavItems = [
    { name: "Langganan", href: "/dashboard/subscription", icon: CreditCard },
  ];

  const currentDateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: business.timezone || "Asia/Jakarta",
  }).format(new Date());

  const getBreadcrumbTitle = () => {
    if (pathname === "/dashboard") return "Overview";
    if (pathname.startsWith("/dashboard/transactions")) return "Transaksi";
    if (pathname.startsWith("/dashboard/products")) return "Produk & Alias";
    if (pathname.startsWith("/dashboard/status")) return "Status Harian";
    if (pathname.startsWith("/dashboard/monitoring")) return "Monitoring";
    if (pathname.startsWith("/dashboard/settings/reminders")) return "Pengingat";
    if (pathname.startsWith("/dashboard/settings/channels")) return "Kanal Pesan";
    if (pathname.startsWith("/dashboard/settings/google-sheets")) return "Google Sheets";
    if (pathname.startsWith("/dashboard/subscription")) return "Langganan";
    return "Dashboard";
  };

  const cycleTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-surface border-b border-border sticky top-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shrink-0">
            OX
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-xs tracking-tight truncate max-w-[150px]">
              {business.name}
            </h1>
            <p className="text-[10px] text-muted truncate">OXID Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover"
            aria-label="Cari"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={cycleTheme}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover"
            aria-label="Ganti Tema"
            title={`Tema: ${theme}`}
          >
            {theme === "system" ? (
              <Laptop className="w-4 h-4" />
            ) : resolvedTheme === "dark" ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSaleModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-fg font-medium text-xs shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat</span>
          </button>
        </div>
      </header>

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 bg-surface border-r border-border flex-col justify-between transition-all duration-200 ${
          isCollapsed ? "w-16" : "w-[220px]"
        }`}
      >
        <div className="flex flex-col h-full justify-between">
          {/* Top Branding & Quick Add */}
          <div className="p-3">
            <div
              className={`flex items-center gap-2.5 px-2 py-2 mb-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <div className="h-7 w-7 rounded-lg bg-primary text-primary-fg flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-2xs">
                OX
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs truncate leading-tight">
                    {business.name}
                  </div>
                  <div className="text-[10px] text-muted flex items-center gap-1 font-mono">
                    <span>Ledger UKM</span>
                    <span>·</span>
                    <span className="capitalize">{role}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            {!isCollapsed ? (
              <button
                type="button"
                onClick={() => setSaleModalOpen(true)}
                className="w-full mt-1 mb-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-fg text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Penjualan</span>
              </button>
            ) : (
              <div className="flex justify-center mb-3">
                <button
                  type="button"
                  onClick={() => setSaleModalOpen(true)}
                  className="w-8 h-8 rounded-lg bg-primary text-primary-fg flex items-center justify-center hover:bg-primary/90 transition-colors shadow-xs"
                  title="Catat Penjualan"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Navigation Lists */}
            <div className="space-y-4">
              {/* Primary Group */}
              <div className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-muted/70">
                    Utama
                  </div>
                )}
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all ${
                        isCollapsed
                          ? `justify-center px-2 py-2 ${
                              isActive
                                ? "bg-primary/10 text-primary shadow-2xs"
                                : "text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                          : `px-2.5 py-1.5 border-l-2 ${
                              isActive
                                ? "bg-primary/10 text-foreground font-semibold border-primary"
                                : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-primary"
                            : "text-muted group-hover:text-foreground"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>

              {/* Operations Group */}
              <div className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-muted/70">
                    Operasional
                  </div>
                )}
                {operationsNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all ${
                        isCollapsed
                          ? `justify-center px-2 py-2 ${
                              isActive
                                ? "bg-primary/10 text-primary shadow-2xs"
                                : "text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                          : `px-2.5 py-1.5 border-l-2 ${
                              isActive
                                ? "bg-primary/10 text-foreground font-semibold border-primary"
                                : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-primary"
                            : "text-muted group-hover:text-foreground"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>

              {/* Account Group */}
              <div className="space-y-0.5">
                {!isCollapsed && (
                  <div className="px-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-muted/70">
                    Akun
                  </div>
                )}
                {accountNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`group flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all ${
                        isCollapsed
                          ? `justify-center px-2 py-2 ${
                              isActive
                                ? "bg-primary/10 text-primary shadow-2xs"
                                : "text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                          : `px-2.5 py-1.5 border-l-2 ${
                              isActive
                                ? "bg-primary/10 text-foreground font-semibold border-primary"
                                : "border-transparent text-muted hover:text-foreground hover:bg-surface-hover/70"
                            }`
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? "text-primary"
                            : "text-muted group-hover:text-foreground"
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Sidebar: Subscription compact row & collapse toggle */}
          <div className="p-3 border-t border-border space-y-2">
            {!isCollapsed && subscriptionState && (
              <div className="p-2.5 rounded-lg border border-border/80 bg-surface-hover/40 text-[11px] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-wider">
                    {subscriptionState.isTrial ? "Pilot Trial" : "Langganan"}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-primary tabular-nums">
                    {subscriptionState.daysRemaining} hari
                  </span>
                </div>
                <div className="w-full bg-border/60 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(10, (subscriptionState.daysRemaining / 14) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Collapse / Expand Toggle Button */}
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
              {!isCollapsed && (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground px-2 py-1 rounded-md transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition"
                title={isCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
                aria-label={isCollapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isCollapsed ? "md:pl-16" : "md:pl-[220px]"
        }`}
      >
        {/* Desktop Topbar */}
        <header className="hidden md:flex h-14 border-b border-border bg-surface/90 backdrop-blur-xs sticky top-0 z-30 px-6 items-center justify-between">
          {/* Breadcrumb / Context */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">{business.name}</span>
            <span className="text-muted/40 font-mono">/</span>
            <span className="text-foreground font-semibold">{getBreadcrumbTitle()}</span>
          </div>

          {/* Center Search / Command Palette Trigger */}
          <div className="w-full max-w-sm px-4">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-muted bg-surface-hover/50 border border-border rounded-lg hover:border-primary/40 hover:text-foreground transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted group-hover:text-primary transition-colors" />
                <span className="text-muted">Cari halaman atau aksi...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono border border-border bg-surface rounded text-muted">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Operational Date */}
            <span className="text-xs text-muted font-mono hidden lg:inline-block">
              {currentDateFormatted}
            </span>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover border border-transparent hover:border-border transition"
              title={`Mode: ${theme} (Klik untuk ganti)`}
              aria-label="Ganti Tema"
            >
              {theme === "system" ? (
                <Laptop className="w-4 h-4" />
              ) : resolvedTheme === "dark" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>

            {/* User Profile Chip */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center font-mono">
                {userEmail.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs text-foreground font-medium max-w-[120px] truncate hidden xl:inline-block">
                {userEmail}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (5 items) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-border z-30 px-3 py-1 flex items-center justify-around pb-safe">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium min-w-[56px] min-h-[44px] justify-center ${
            pathname === "/dashboard" ? "text-primary font-semibold" : "text-muted hover:text-foreground"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Overview</span>
        </Link>

        <Link
          href="/dashboard/transactions"
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium min-w-[56px] min-h-[44px] justify-center ${
            pathname.startsWith("/dashboard/transactions")
              ? "text-primary font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Transaksi</span>
        </Link>

        {/* Center Restrained Action Button */}
        <button
          type="button"
          onClick={() => setSaleModalOpen(true)}
          className="flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center"
          aria-label="Catat Penjualan"
        >
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-fg flex items-center justify-center shadow-xs hover:bg-primary/90 transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        </button>

        <Link
          href="/dashboard/products"
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium min-w-[56px] min-h-[44px] justify-center ${
            pathname.startsWith("/dashboard/products")
              ? "text-primary font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produk</span>
        </Link>

        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className={`flex flex-col items-center gap-0.5 p-1 text-[10px] font-medium min-w-[56px] min-h-[44px] justify-center ${
            mobileSheetOpen ? "text-primary font-semibold" : "text-muted hover:text-foreground"
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Mobile Drawer "Lainnya" */}
      {mobileSheetOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end animate-in fade-in duration-150"
          onClick={() => setMobileSheetOpen(false)}
        >
          <div
            className="w-full bg-surface border-t border-border rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h3 className="font-semibold text-sm">Menu Tambahan</h3>
                <p className="text-xs text-muted">Operasional & Pengaturan</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1 rounded-lg text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/dashboard/status"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <CalendarCheck className="w-4 h-4 text-muted" />
                <span>Status Harian</span>
              </Link>

              <Link
                href="/dashboard/monitoring"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <Activity className="w-4 h-4 text-muted" />
                <span>Monitoring</span>
              </Link>

              <Link
                href="/dashboard/settings/reminders"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <Bell className="w-4 h-4 text-muted" />
                <span>Pengingat</span>
              </Link>

              <Link
                href="/dashboard/settings/channels"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <Radio className="w-4 h-4 text-muted" />
                <span>Kanal Pesan</span>
              </Link>

              <Link
                href="/dashboard/settings/google-sheets"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <FileSpreadsheet className="w-4 h-4 text-muted" />
                <span>Google Sheets</span>
              </Link>

              <Link
                href="/dashboard/subscription"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border hover:bg-surface-hover"
              >
                <CreditCard className="w-4 h-4 text-muted" />
                <span>Langganan</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted truncate max-w-[200px]">
                {userEmail}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenCatatPenjualan={() => setSaleModalOpen(true)}
      />

      {/* Catat Penjualan Modal */}
      <CatatPenjualanModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        products={products}
      />
    </div>
  );
}
