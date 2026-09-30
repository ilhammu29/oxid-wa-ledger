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
    <div className="space-y-4">
      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari teks pesan / catatan transaksi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
            />
          </form>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Source Filter */}
            <select
              value={searchParams.get("source") || "all"}
              onChange={(e) => updateParam("source", e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Source</option>
              <option value="telegram">Telegram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="dashboard">Dashboard</option>
            </select>

            {/* Status Filter */}
            <select
              value={searchParams.get("status") || "all"}
              onChange={(e) => updateParam("status", e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="corrected">Corrected</option>
            </select>

            {/* Product Filter */}
            {products.length > 1 && (
              <select
                value={searchParams.get("productId") || "all"}
                onChange={(e) => updateParam("productId", e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="px-2.5 py-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {transactions.length === 0 ? (
        <div className="py-16 text-center text-zinc-400 bg-white rounded-xl border border-zinc-200">
          <Receipt className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700">
            Tidak ada transaksi ditemukan
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase font-semibold tracking-wider text-[11px]">
                <th className="py-3 px-4">Waktu / Tanggal</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Kuantitas</th>
                <th className="py-3 px-4">Harga Satuan</th>
                <th className="py-3 px-4">Total Nilai</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 text-zinc-500 font-mono whitespace-nowrap">
                    {formatTime(tx.transaction_at)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900 whitespace-nowrap">
                    {tx.product_name || "Produk Default"}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-zinc-800 whitespace-nowrap">
                    {tx.quantity} {tx.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-600 whitespace-nowrap">
                    Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-zinc-950 whitespace-nowrap">
                    Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {sourceBadge(tx.source)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {statusBadge(tx.status)}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center text-zinc-400 group-hover:text-zinc-700 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-500 bg-zinc-50/50">
            <div>
              Menampilkan{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(totalCount, (currentPage - 1) * pageSize + 1)}
              </span>{" "}
              –{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(totalCount, currentPage * pageSize)}
              </span>{" "}
              dari{" "}
              <span className="font-semibold text-zinc-800">{totalCount}</span>{" "}
              transaksi
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-zinc-700 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        timezone={timezone}
      />
    </div>
  );
}
