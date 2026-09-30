"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Package,
  CalendarCheck,
  Download,
  LogOut,
  Menu,
  X,
  Plus,
  Activity,
  Bell,
  Radio,
} from "lucide-react";
import { logoutAction } from "@/app/dashboard/actions";
import { CatatPenjualanModal } from "./catat-penjualan-modal";

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
  children: React.ReactNode;
}

export function DashboardShell({
  business,
  role,
  userEmail,
  products,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transaksi", href: "/dashboard/transactions", icon: Receipt },
    { name: "Produk", href: "/dashboard/products", icon: Package },
    { name: "Status Harian", href: "/dashboard/status", icon: CalendarCheck },
    { name: "Monitoring & Bot", href: "/dashboard/monitoring", icon: Activity },
    { name: "Pengingat Harian", href: "/dashboard/settings/reminders", icon: Bell },
    { name: "Kanal Pesan", href: "/dashboard/settings/channels", icon: Radio },
  ];

  const currentDateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: business.timezone || "Asia/Jakarta",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            OX
          </div>
          <div>
            <h1 className="font-semibold text-zinc-100 text-sm tracking-tight leading-tight">
              {business.name}
            </h1>
            <p className="text-[11px] text-zinc-400">OXID WA Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaleModalOpen(true)}
            className="p-1.5 rounded-lg bg-emerald-400 text-zinc-950 hover:bg-emerald-300 transition-colors"
            title="Catat Penjualan"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand & Business Header */}
          <div className="px-6 py-5 border-b border-zinc-800/80 hidden md:block">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-emerald-400 font-bold text-base shadow-sm">
                OX
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-zinc-100 text-sm tracking-tight truncate">
                  {business.name}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                    {role}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="px-4 py-4">
            <button
              onClick={() => {
                setSaleModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs tracking-wide shadow-sm transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Catat Penjualan
            </button>
          </div>

          {/* Nav Items */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-800 font-semibold"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: User & Logout */}
        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          <a
            href="/api/export/ledger.xlsx"
            download
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Unduh Spreadsheet (.xlsx)</span>
          </a>

          <div className="pt-2 flex items-center justify-between text-xs text-zinc-400">
            <div className="truncate max-w-[140px]" title={userEmail}>
              <p className="text-[11px] text-zinc-500">Akun:</p>
              <p className="truncate text-zinc-300 font-mono text-[11px]">{userEmail}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-100 text-zinc-900">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white border-b border-zinc-200/80 sticky top-0 z-20">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 font-mono">
              Tanggal Operasional
            </h2>
            <p className="text-sm font-semibold text-zinc-900">
              {currentDateFormatted}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/export/ledger.xlsx"
              download
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800 font-medium text-xs shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              Export Spreadsheet
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Catat Penjualan Modal */}
      <CatatPenjualanModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        products={products}
      />
    </div>
  );
}
