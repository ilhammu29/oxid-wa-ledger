"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  Activity,
  ScrollText,
  Sliders,
  ArrowRight,
  ExternalLink,
  X,
} from "lucide-react";

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Platform" | "Operasional" | "Konfigurasi" | "Navigasi Luar";
}

const adminNavCommands: CommandItem[] = [
  {
    id: "overview",
    name: "Overview",
    description: "Ringkasan metrik tenant, langganan, dan kesehatan sistem",
    href: "/admin",
    icon: LayoutDashboard,
    group: "Platform",
  },
  {
    id: "businesses",
    name: "Bisnis Klien",
    description: "Kelola daftar seluruh tenant bisnis dan status operasional",
    href: "/admin/businesses",
    icon: Building2,
    group: "Platform",
  },
  {
    id: "users",
    name: "Pengguna & Admin",
    description: "Kelola hak akses operator platform dan daftar user tenant",
    href: "/admin/users",
    icon: Users,
    group: "Platform",
  },
  {
    id: "subscriptions",
    name: "Langganan SaaS",
    description: "Kelola siklus masa aktif, perpanjangan, dan status langganan",
    href: "/admin/subscriptions",
    icon: CreditCard,
    group: "Platform",
  },
  {
    id: "payments",
    name: "Konfirmasi Pembayaran",
    description: "Verifikasi atau tolak bukti transfer pembayaran manual",
    href: "/admin/payments",
    icon: Receipt,
    group: "Platform",
  },
  {
    id: "system",
    name: "Status Sistem",
    description: "Cek kesehatan database, adapter Telegram, Sheets, dan scheduler",
    href: "/admin/system",
    icon: Activity,
    group: "Operasional",
  },
  {
    id: "audit",
    name: "Audit Trail",
    description: "Jejak riwayat seluruh aksi administratif platform",
    href: "/admin/audit",
    icon: ScrollText,
    group: "Operasional",
  },
  {
    id: "billing",
    name: "Pengaturan Tagihan",
    description: "Kelola nomor rekening bank dan instruksi transfer pembayaran",
    href: "/admin/settings/billing",
    icon: Sliders,
    group: "Konfigurasi",
  },
  {
    id: "dashboard-merchant",
    name: "Ke Dashboard Merchant",
    description: "Beralih ke tampilan aplikasi merchant / usaha",
    href: "/dashboard",
    icon: ExternalLink,
    group: "Navigasi Luar",
  },
];

export function AdminCommandPalette({ isOpen, onClose }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const handleClose = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const filteredCommands = adminNavCommands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.name.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          router.push(selected.href);
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, router, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-20 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-muted/20">
          <Search className="w-4 h-4 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Ketik untuk mencari halaman atau menu admin..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-border/40 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada menu admin yang cocok dengan &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    router.push(cmd.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-primary/20 border-primary/30 text-primary"
                          : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {cmd.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                          {cmd.group}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {cmd.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected
                        ? "text-primary translate-x-0.5"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
                ↓
              </kbd>{" "}
              navigasi
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
                ↵
              </kbd>{" "}
              pilih
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-[10px]">
              Esc
            </kbd>{" "}
            tutup
          </span>
        </div>
      </div>
    </div>
  );
}
