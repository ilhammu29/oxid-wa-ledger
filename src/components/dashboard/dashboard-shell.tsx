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
  X,
  Plus,
  Activity,
  Bell,
  Radio,
  FileSpreadsheet,
  CreditCard,
  Sparkles,
  Search,
  Calendar,
  Sun,
  MoreHorizontal,
  Settings,
  Crown,
  ArrowRight,
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
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);

  const primaryNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transaksi", href: "/dashboard/transactions", icon: Receipt },
    { name: "Produk", href: "/dashboard/products", icon: Package },
    { name: "Status Harian", href: "/dashboard/status", icon: CalendarCheck },
    { name: "Monitoring & Bot", href: "/dashboard/monitoring", icon: Activity },
    { name: "Pengingat Harian", href: "/dashboard/settings/reminders", icon: Bell },
    { name: "Kanal Pesan", href: "/dashboard/settings/channels", icon: Radio },
    { name: "Google Sheets", href: "/dashboard/settings/google-sheets", icon: FileSpreadsheet },
  ];

  const secondaryNavItems = [
    { name: "Langganan", href: "/dashboard/subscription", icon: CreditCard },
    { name: "Pengaturan", href: "/dashboard/settings/channels", icon: Settings },
  ];

  const mobileBottomNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transaksi", href: "/dashboard/transactions", icon: Receipt },
    { name: "Produk", href: "/dashboard/products", icon: Package },
    { name: "Pengingat", href: "/dashboard/settings/reminders", icon: Bell },
  ];

  const currentDateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: business.timezone || "Asia/Jakarta",
  }).format(new Date());

  const getRoleLabel = (r: string) => {
    switch (r) {
      case "owner":
        return "Pemilik Bisnis";
      case "admin":
        return "Admin";
      default:
        return "Operator";
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col md:flex-row text-slate-100 font-sans selection:bg-violet-500/30 selection:text-violet-200 relative overflow-x-hidden">
      {/* Ambient background glow effects matching reference images */}
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-violet-600/[0.07] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/[0.05] rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0D121F]/90 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-violet-900/40">
            <span className="text-[11px] tracking-wider">OX</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-tight truncate max-w-[170px]">
              {business.name}
            </h1>
            <p className="text-[10px] text-slate-400">OXID Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaleModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-900/30 active:scale-95 transition-all"
            title="Catat Transaksi"
          >
            <Plus className="w-4 h-4" />
            <span>Catat</span>
          </button>
          <Link
            href="/dashboard/monitoring"
            className="p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 bg-[#0D121F]/95 backdrop-blur-md border-r border-white/[0.08] flex-col justify-between">
        <div>
          {/* Logo & Brand Header */}
          <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-violet-600/30 ring-1 ring-violet-400/40">
                <span className="text-xs font-black">OX</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm tracking-tight">OXID Ledger</span>
                </div>
                <p className="text-[10px] text-violet-400 font-medium">Aplikasi Pembukuan UMKM</p>
              </div>
            </div>
          </div>

          {/* Quick Action Button: Catat Transaksi */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => setSaleModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-violet-600/25 transition-all active:scale-[0.99] border border-violet-400/30"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Catat Transaksi</span>
            </button>
          </div>

          {/* Nav Items Group 1 */}
          <nav className="px-3 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-340px)]">
            {primaryNavItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-violet-600 text-white font-semibold shadow-md shadow-violet-900/40"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-2 pb-1 px-3">
              <div className="h-px bg-white/[0.06]" />
            </div>

            {/* Nav Items Group 2 (Langganan, Pengaturan) */}
            {secondaryNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-violet-600 text-white font-semibold shadow-md shadow-violet-900/40"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Subscription Widget & User Logout */}
        <div className="p-3 border-t border-white/[0.08] space-y-2.5 bg-[#0A0E1A]">
          {/* Upgrade / Subscription Mini Card */}
          <Link
            href="/dashboard/subscription"
            className="block p-3 rounded-xl bg-gradient-to-br from-violet-950/50 via-[#131A2E] to-[#101626] border border-violet-500/20 hover:border-violet-500/40 transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-300">
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">
                    {subscriptionState?.isTrial ? "Masa Trial" : "Langganan"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {subscriptionState?.daysRemaining !== undefined
                      ? `${subscriptionState.daysRemaining} hari tersisa`
                      : "Kelola paket"}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* User Account Bar */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="truncate max-w-[155px]" title={userEmail}>
              <p className="truncate text-xs font-medium text-slate-300">{userEmail}</p>
              <p className="text-[10px] text-violet-400 font-mono capitalize">{role}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 z-10">
        {/* Desktop Top Navbar */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-[#0D121F]/80 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-30">
          {/* Left: Global Search Mock / Operational Input */}
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              readOnly
              placeholder="Cari transaksi, produk..."
              className="w-full bg-[#13192B] border border-white/[0.08] rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none cursor-default"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded">
              ⌘ K
            </span>
          </div>

          {/* Right: Date, Notifications, Theme, Business Chip, CTA */}
          <div className="flex items-center gap-3">
            {/* Operational Date Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#13192B] border border-white/[0.08] text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              <span>{currentDateFormatted}</span>
            </div>

            {/* Notification Icon */}
            <Link
              href="/dashboard/monitoring"
              className="p-2 rounded-xl bg-[#13192B] border border-white/[0.08] text-slate-300 hover:text-white hover:border-violet-500/30 transition-colors relative"
              title="Notifikasi & Monitoring"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-[#0D121F]" />
            </Link>

            {/* Theme Toggle Display */}
            <div
              className="p-2 rounded-xl bg-[#13192B] border border-white/[0.08] text-slate-400"
              title="Tema Gelap Aktif"
            >
              <Sun className="w-4 h-4 text-amber-400/80" />
            </div>

            {/* Business / Profile Chip */}
            <div className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-[#13192B] border border-white/[0.08]">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {business.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                  {business.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {getRoleLabel(role)}
                </p>
              </div>
            </div>

            {/* Catat Transaksi CTA */}
            <button
              onClick={() => setSaleModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-900/30 transition-all active:scale-95 border border-violet-400/30"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Catat Transaksi</span>
            </button>
          </div>
        </header>

        {/* Trial Status Banner */}
        {subscriptionState?.isTrial && (
          <div
            className={`px-4 sm:px-8 py-2 flex items-center justify-between text-xs font-medium border-b ${
              subscriptionState.daysRemaining <= 3
                ? "bg-rose-950/40 border-rose-800/40 text-rose-300"
                : subscriptionState.daysRemaining <= 7
                ? "bg-amber-950/40 border-amber-800/40 text-amber-300"
                : "bg-violet-950/30 border-violet-800/30 text-violet-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>
                Masa Uji Coba: <strong>{subscriptionState.daysRemaining} hari tersisa</strong>
                {subscriptionState.daysRemaining <= 3 && " — Segera aktifkan paket agar bot Telegram tetap melayani transaksi."}
              </span>
            </div>
            <Link
              href="/dashboard/subscription"
              className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-xs transition-colors"
            >
              Lihat Paket
            </Link>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed 5-item thumb friendly) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#0D121F]/95 backdrop-blur-lg border-t border-white/[0.08] z-40 px-2 py-1.5 flex items-center justify-around safe-area-bottom shadow-2xl">
        {mobileBottomNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[56px] min-h-[44px] transition-all ${
                isActive
                  ? "text-violet-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-lg ${
                  isActive ? "bg-violet-600/20 text-violet-400" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* 5th Item: "Lainnya" (Opens Drawer / Bottom Sheet) */}
        <button
          onClick={() => setMobileSheetOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl min-w-[56px] min-h-[44px] transition-all ${
            mobileSheetOpen ? "text-violet-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div
            className={`p-1 rounded-lg ${
              mobileSheetOpen ? "bg-violet-600/20 text-violet-400" : ""
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Lainnya</span>
        </button>
      </nav>

      {/* Mobile "Lainnya" Bottom Sheet Drawer */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setMobileSheetOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Sheet */}
          <div className="relative bg-[#111726] border-t border-white/[0.1] rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto z-10 shadow-2xl space-y-4">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-600/50 mx-auto mb-2" />

            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="font-bold text-white text-sm">Menu Lainnya</h3>
                <p className="text-[11px] text-slate-400">{business.name}</p>
              </div>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/dashboard/status"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <CalendarCheck className="w-4 h-4 text-violet-400" />
                <span>Status Harian</span>
              </Link>
              <Link
                href="/dashboard/monitoring"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <Activity className="w-4 h-4 text-sky-400" />
                <span>Monitoring & Bot</span>
              </Link>
              <Link
                href="/dashboard/settings/channels"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Kanal Pesan</span>
              </Link>
              <Link
                href="/dashboard/settings/google-sheets"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                <span>Google Sheets</span>
              </Link>
              <Link
                href="/dashboard/subscription"
                onClick={() => setMobileSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Langganan</span>
              </Link>
              <a
                href="/api/export/ledger.xlsx"
                download
                className="flex items-center gap-3 p-3 rounded-xl bg-[#161F33] border border-white/[0.06] text-xs font-medium text-slate-200 hover:text-white hover:border-violet-500/30"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Unduh Excel</span>
              </a>
            </div>

            {/* Logout button in drawer */}
            <div className="pt-2 border-t border-white/[0.08]">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Catat Penjualan Modal (Preserved exactly) */}
      <CatatPenjualanModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        products={products}
      />
    </div>
  );
}
