"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  Activity,
  ScrollText,
  Sliders,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const mainNavItems: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Bisnis Klien", href: "/admin/businesses", icon: Building2 },
  { name: "Pengguna & Admin", href: "/admin/users", icon: Users },
  { name: "Langganan SaaS", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Konfirmasi Bayar", href: "/admin/payments", icon: Receipt },
];

const operationsNavItems: NavItem[] = [
  { name: "Status Sistem", href: "/admin/system", icon: Activity },
  { name: "Audit Trail", href: "/admin/audit", icon: ScrollText },
];

const settingsNavItems: NavItem[] = [
  { name: "Pengaturan Tagihan", href: "/admin/settings/billing", icon: Sliders },
];

export function AdminNav() {
  const pathname = usePathname();

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav className="flex-1 space-y-6 px-3 py-4 text-xs font-medium">
      <div>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Platform Menu
        </p>
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Operasional
        </p>
        <div className="space-y-1">
          {operationsNavItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Konfigurasi
        </p>
        <div className="space-y-1">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-emerald-400" : "text-zinc-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
