"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
} from "lucide-react";
import {
  TransactionDetailModal,
  TransactionRowData,
} from "./transaction-detail-modal";

interface ProductItem {
  id: string;
  name: string;
}

interface TransactionsViewProps {
  transactions: TransactionRowData[];
  products: ProductItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  timezone: string;
}

export function TransactionsView({
  transactions,
  products,
  totalCount,
  currentPage,
  pageSize,
  timezone,
}: TransactionsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedTx, setSelectedTx] = useState<TransactionRowData | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const setPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", searchInput.trim());
  };

  const formatTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const statusBadge = (st: string) => {
    if (st === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Berhasil
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
          <XCircle className="w-3 h-3 text-rose-500" />
          Dibatalkan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
        <RefreshCw className="w-3 h-3 text-amber-500" />
        Koreksi
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") {
      return (
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          WhatsApp
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
        Dashboard
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Pantau dan telusuri semua riwayat transaksi penjualan bisnis secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="/api/export/ledger.xlsx"
            download
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground text-xs font-medium transition-colors shadow-xs"
          >
            <span>Export Excel</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari pesan Telegram, nama produk, catatan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Source Filter */}
            <select
              value={searchParams.get("source") || "all"}
              onChange={(e) => updateParam("source", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary text-xs"
            >
              <option value="all">Semua Kanal</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="dashboard">Dashboard</option>
            </select>

            {/* Status Filter */}
            <select
              value={searchParams.get("status") || "all"}
              onChange={(e) => updateParam("status", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary text-xs"
            >
              <option value="all">Semua Status</option>
              <option value="confirmed">Berhasil</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="corrected">Koreksi</option>
            </select>

            {/* Product Filter */}
            {products.length > 1 && (
              <select
                value={searchParams.get("productId") || "all"}
                onChange={(e) => updateParam("productId", e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary text-xs"
              >
                <option value="all">Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {(searchParams.get("q") ||
              searchParams.get("source") ||
              searchParams.get("status") ||
              searchParams.get("productId")) && (
              <button
                onClick={() => {
                  setSearchInput("");
                  router.push(pathname);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-border text-muted hover:text-foreground hover:bg-surface-hover text-xs transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section: Table for Desktop, Cards for Mobile */}
      {transactions.length === 0 ? (
        <div className="py-14 text-center text-muted bg-surface rounded-xl border border-border">
          <Receipt className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground">
            Tidak ada transaksi ditemukan
          </p>
          <p className="text-xs text-muted mt-1">
            Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-hover/60 text-muted uppercase font-semibold tracking-wider text-[11px]">
                  <th className="py-2.5 px-3.5">Waktu</th>
                  <th className="py-2.5 px-3.5">Produk</th>
                  <th className="py-2.5 px-3.5">Kuantitas</th>
                  <th className="py-2.5 px-3.5">Harga Satuan</th>
                  <th className="py-2.5 px-3.5">Total Nilai</th>
                  <th className="py-2.5 px-3.5">Kanal</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-surface-hover transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5 text-muted font-mono whitespace-nowrap">
                      {formatTime(tx.transaction_at)}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-foreground whitespace-nowrap">
                      {tx.product_name || "Produk Default"}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-medium text-foreground whitespace-nowrap">
                      {tx.quantity} {tx.unit}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-muted whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono font-bold text-foreground whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {sourceBadge(tx.source)}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {statusBadge(tx.status)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                        Detail
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden p-3 space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/40 active:scale-[0.99] transition-all space-y-2 cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">
                    {tx.product_name || "Produk Default"}
                  </span>
                  <span className="font-bold text-primary font-mono text-sm">
                    Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-mono">
                    {tx.quantity} {tx.unit} × Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                  </span>
                  <span className="text-[11px] font-mono">
                    {formatTime(tx.transaction_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-border">
                  {sourceBadge(tx.source)}
                  {statusBadge(tx.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-muted bg-surface-hover/40">
            <div>
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
              </span>{" "}
              –{" "}
              <span className="font-semibold text-foreground">
                {Math.min(totalCount, currentPage * pageSize)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground">{totalCount}</span>{" "}
              transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-foreground font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-md border border-border bg-surface hover:bg-surface-hover text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal Component */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        timezone={timezone}
      />
    </div>
  );
}
