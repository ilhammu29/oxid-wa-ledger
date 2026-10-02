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
  badge?: number | string;
}

interface AdminNavProps {
  isCollapsed?: boolean;
  onItemClick?: () => void;
  pendingPaymentsCount?: number;
}

export function AdminNav({
  isCollapsed = false,
  onItemClick,
  pendingPaymentsCount = 0,
}: AdminNavProps) {
  const pathname = usePathname();

  const isLinkActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const mainNavItems: NavItem[] = [
    { name: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
    { name: "Bisnis Klien", href: "/admin/businesses", icon: Building2 },
    { name: "Pengguna & Admin", href: "/admin/users", icon: Users },
    { name: "Langganan SaaS", href: "/admin/subscriptions", icon: CreditCard },
    {
      name: "Konfirmasi Bayar",
      href: "/admin/payments",
      icon: Receipt,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
    },
  ];

  const operationsNavItems: NavItem[] = [
    { name: "Status Sistem", href: "/admin/system", icon: Activity },
    { name: "Audit Trail", href: "/admin/audit", icon: ScrollText },
  ];

  const settingsNavItems: NavItem[] = [
    { name: "Pengaturan Tagihan", href: "/admin/settings/billing", icon: Sliders },
  ];

  const renderNavGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none">
          {title}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isLinkActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              title={isCollapsed ? item.name : undefined}
              className={`group flex items-center ${
                isCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2"
              } rounded-xl text-xs transition-colors relative ${
                active
                  ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </div>

              {!isCollapsed && item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {item.badge}
                </span>
              )}

              {isCollapsed && item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-card" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <nav className="flex-1 space-y-5 px-3 py-3 text-xs font-medium">
      {renderNavGroup("Platform", mainNavItems)}
      {renderNavGroup("Operasional", operationsNavItems)}
      {renderNavGroup("Konfigurasi", settingsNavItems)}
    </nav>
  );
}
