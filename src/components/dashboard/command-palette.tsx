"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Receipt,
  Package,
  CalendarCheck,
  Activity,
  Bell,
  MessageSquare,
  FileSpreadsheet,
  CreditCard,
  PlusCircle,
  Sun,
  Moon,
  Laptop,
  X,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";

interface CommandItem {
  id: string;
  title: string;
  category: "Halaman" | "Aksi Cepat" | "Tema";
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  action: () => void;
  active?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCatatPenjualan?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenCatatPenjualan,
}: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // Pages
      {
        id: "nav-overview",
        title: "Overview (Beranda)",
        category: "Halaman",
        icon: LayoutDashboard,
        keywords: ["dashboard", "home", "beranda", "ringkasan", "omzet"],
        action: () => router.push("/dashboard"),
        active: pathname === "/dashboard",
      },
      {
        id: "nav-transactions",
        title: "Riwayat Transaksi",
        category: "Halaman",
        icon: Receipt,
        keywords: ["transaksi", "penjualan", "history", "mutasi", "ledger"],
        action: () => router.push("/dashboard/transactions"),
        active: pathname === "/dashboard/transactions",
      },
      {
        id: "nav-products",
        title: "Katalog Produk & Alias",
        category: "Halaman",
        icon: Package,
        keywords: ["produk", "barang", "komoditas", "alias", "harga", "satuan"],
        action: () => router.push("/dashboard/products"),
        active: pathname === "/dashboard/products",
      },
      {
        id: "nav-status",
        title: "Status Operasional Harian",
        category: "Halaman",
        icon: CalendarCheck,
        keywords: ["status", "harian", "tutup", "libur", "no sale", "buka"],
        action: () => router.push("/dashboard/status"),
        active: pathname === "/dashboard/status",
      },
      {
        id: "nav-monitoring",
        title: "Monitoring & Bot Engine",
        category: "Halaman",
        icon: Activity,
        keywords: ["monitoring", "bot", "health", "kesehatan", "system", "review"],
        action: () => router.push("/dashboard/monitoring"),
        active: pathname === "/dashboard/monitoring",
      },
      {
        id: "nav-reminders",
        title: "Pengaturan Pengingat Harian",
        category: "Halaman",
        icon: Bell,
        keywords: ["pengingat", "reminder", "jadwal", "notifikasi", "cron"],
        action: () => router.push("/dashboard/settings/reminders"),
        active: pathname === "/dashboard/settings/reminders",
      },
      {
        id: "nav-channels",
        title: "Kanal Komunikasi (Telegram & WA)",
        category: "Halaman",
        icon: MessageSquare,
        keywords: ["channel", "telegram", "whatsapp", "operator", "pairing"],
        action: () => router.push("/dashboard/settings/channels"),
        active: pathname === "/dashboard/settings/channels",
      },
      {
        id: "nav-sheets",
        title: "Integrasi Google Sheets",
        category: "Halaman",
        icon: FileSpreadsheet,
        keywords: ["google", "sheets", "sync", "spreadsheet", "mirror", "excel"],
        action: () => router.push("/dashboard/settings/google-sheets"),
        active: pathname === "/dashboard/settings/google-sheets",
      },
      {
        id: "nav-subscription",
        title: "Status & Paket Langganan",
        category: "Halaman",
        icon: CreditCard,
        keywords: ["langganan", "subscription", "paket", "billing", "bayar", "transfer"],
        action: () => router.push("/dashboard/subscription"),
        active: pathname === "/dashboard/subscription",
      },
      // Quick Actions
      {
        id: "action-catat",
        title: "Catat Penjualan Manual",
        category: "Aksi Cepat",
        icon: PlusCircle,
        keywords: ["catat", "tambah transaksi", "jual", "penjualan", "manual"],
        action: () => {
          if (onOpenCatatPenjualan) onOpenCatatPenjualan();
        },
      },
      {
        id: "action-tambah-produk",
        title: "Tambah Produk Baru",
        category: "Aksi Cepat",
        icon: Package,
        keywords: ["tambah produk", "produk baru", "new product", "komoditas"],
        action: () => router.push("/dashboard/products"),
      },
      {
        id: "action-hubungkan-telegram",
        title: "Hubungkan Operator Telegram",
        category: "Aksi Cepat",
        icon: MessageSquare,
        keywords: ["pair", "pairing", "telegram", "operator", "koneksi"],
        action: () => router.push("/dashboard/settings/channels"),
      },
      {
        id: "action-sync-sheets",
        title: "Sinkronkan ke Google Sheets",
        category: "Aksi Cepat",
        icon: FileSpreadsheet,
        keywords: ["sync", "google sheets", "sinkronisasi"],
        action: () => router.push("/dashboard/settings/google-sheets"),
      },
      // Theme Actions
      {
        id: "theme-light",
        title: "Tema: Terang (Light)",
        category: "Tema",
        icon: Sun,
        keywords: ["tema", "terang", "light", "putih"],
        action: () => setTheme("light"),
        active: theme === "light",
      },
      {
        id: "theme-dark",
        title: "Tema: Gelap (Dark)",
        category: "Tema",
        icon: Moon,
        keywords: ["tema", "gelap", "dark", "hitam"],
        action: () => setTheme("dark"),
        active: theme === "dark",
      },
      {
        id: "theme-system",
        title: "Tema: Ikuti Sistem",
        category: "Tema",
        icon: Laptop,
        keywords: ["tema", "sistem", "system", "auto"],
        action: () => setTheme("system"),
        active: theme === "system",
      },
    ];
    return list;
  }, [router, pathname, setTheme, theme, onOpenCatatPenjualan]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [items, query]);

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setQuery("");
    }
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or shortcut
        }
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface text-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 border-b border-border gap-2.5">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari halaman atau tindakan... (Esc untuk menutup)"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded text-muted hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono border border-border bg-surface-hover rounded text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              Tidak ada hasil yang cocok dengan &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-primary/10 text-primary font-medium dark:bg-primary/20"
                      : "text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-muted" />
                    <span className="truncate">{item.title}</span>
                    {item.active && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-hover text-muted border border-border">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-muted">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3.5 py-2 border-t border-border bg-surface-hover flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-[10px] font-mono mr-1">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-[10px] font-mono mr-1">
                ↓
              </kbd>
              navigasi
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border bg-surface text-[10px] font-mono mr-1">
                ↵
              </kbd>
              pilih
            </span>
          </div>
          <span>OXID Quick Search</span>
        </div>
      </div>
    </div>
  );
}
