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
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Confirmed
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
        <RefreshCw className="w-3 h-3 text-amber-600" />
        Corrected
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") {
      return (
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          WhatsApp
        </span>
      );
    }
    return (
      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
        Dashboard
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Kelola dan pantau semua transaksi penjualan bisnis Anda secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <a
            href="/api/export/ledger.xlsx"
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#161F33] border border-white/[0.08] hover:border-violet-500/30 text-slate-200 text-xs font-medium transition-colors"
          >
            <span>Export Excel</span>
          </a>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111726] p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari teks pesan, produk, atau catatan..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/[0.08] bg-[#161F33] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Source Filter */}
            <select
              value={searchParams.get("source") || "all"}
              onChange={(e) => updateParam("source", e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/[0.08] bg-[#161F33] text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all" className="bg-[#111726]">Semua Kanal</option>
              <option value="telegram" className="bg-[#111726]">Telegram</option>
              <option value="whatsapp" className="bg-[#111726]">WhatsApp</option>
              <option value="dashboard" className="bg-[#111726]">Dashboard</option>
            </select>

            {/* Status Filter */}
            <select
              value={searchParams.get("status") || "all"}
              onChange={(e) => updateParam("status", e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/[0.08] bg-[#161F33] text-white focus:outline-none focus:border-violet-500"
            >
              <option value="all" className="bg-[#111726]">Semua Status</option>
              <option value="confirmed" className="bg-[#111726]">Berhasil</option>
              <option value="cancelled" className="bg-[#111726]">Dibatalkan</option>
              <option value="corrected" className="bg-[#111726]">Koreksi</option>
            </select>

            {/* Product Filter */}
            {products.length > 1 && (
              <select
                value={searchParams.get("productId") || "all"}
                onChange={(e) => updateParam("productId", e.target.value)}
                className="px-3 py-2 rounded-xl border border-white/[0.08] bg-[#161F33] text-white focus:outline-none focus:border-violet-500"
              >
                <option value="all" className="bg-[#111726]">Semua Produk</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111726]">
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
                className="px-3 py-2 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section: Table for Desktop, Cards for Mobile */}
      {transactions.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-[#111726] rounded-2xl border border-white/[0.08]">
          <Receipt className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-white">
            Tidak ada transaksi ditemukan
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-[#111726] shadow-sm overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#161F33] text-slate-400 uppercase font-semibold tracking-wider text-[11px]">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4">Kuantitas</th>
                  <th className="py-3 px-4">Harga Satuan</th>
                  <th className="py-3 px-4">Total Nilai</th>
                  <th className="py-3 px-4">Kanal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-violet-600/[0.06] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatTime(tx.transaction_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      {tx.product_name || "Produk Default"}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-200 whitespace-nowrap">
                      {tx.quantity} {tx.unit}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {sourceBadge(tx.source)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {statusBadge(tx.status)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 group-hover:text-violet-300">
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
          <div className="sm:hidden p-3 space-y-2.5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-3.5 rounded-xl bg-[#161F33] border border-white/[0.06] hover:border-violet-500/30 active:scale-[0.99] transition-all space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">
                    {tx.product_name || "Produk Default"}
                  </span>
                  <span className="font-bold text-violet-400 font-mono text-sm">
                    Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">
                    {tx.quantity} {tx.unit} × Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatTime(tx.transaction_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                  {sourceBadge(tx.source)}
                  {statusBadge(tx.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 bg-[#161F33]/60">
            <div>
              Menampilkan{" "}
              <span className="font-semibold text-white">
                {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
              </span>{" "}
              –{" "}
              <span className="font-semibold text-white">
                {Math.min(totalCount, currentPage * pageSize)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-white">{totalCount}</span>{" "}
              transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-[#111726] hover:bg-white/[0.05] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-slate-300 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-white/[0.08] bg-[#111726] hover:bg-white/[0.05] text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
