"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
  Plus,
  Download,
  Archive,
  MoreHorizontal,
  Ban,
  X,
} from "lucide-react";
import {
  TransactionDetailModal,
  TransactionRowData,
} from "./transaction-detail-modal";
import { CatatPenjualanModal } from "./catat-penjualan-modal";
import { EditTransactionModal } from "./edit-transaction-modal";
import { VoidTransactionModal } from "./void-transaction-modal";
import { ArchiveTransactionModal } from "./archive-transaction-modal";

interface ProductItem {
  id: string;
  name: string;
  unit?: string;
  default_price?: number;
  is_default?: boolean;
  active?: boolean;
}

interface TransactionsViewProps {
  transactions: TransactionRowData[];
  products: ProductItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  timezone: string;
}

interface MenuAnchorState {
  tx: TransactionRowData;
  top: number;
  right: number;
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
  const [editingTx, setEditingTx] = useState<TransactionRowData | null>(null);
  const [voidingTx, setVoidingTx] = useState<TransactionRowData | null>(null);
  const [archivingTx, setArchivingTx] = useState<TransactionRowData | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchorState | null>(null);
  const [catatModalOpen, setCatatModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, tx: TransactionRowData) => {
    e.preventDefault();
    e.stopPropagation();
    if (menuAnchor?.tx.id === tx.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isNearBottom = rect.bottom + 120 > window.innerHeight;
    const top = isNearBottom ? Math.max(10, rect.top - 88) : rect.bottom + 4;
    const right = Math.max(8, window.innerWidth - rect.right);
    setMenuAnchor({
      tx,
      top,
      right,
    });
  };

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

  const statusBadge = (st: string, archived?: boolean | null) => {
    return (
      <div className="inline-flex items-center gap-1.5">
        {st === "confirmed" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Berhasil
          </span>
        )}
        {st === "cancelled" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
            <XCircle className="w-3 h-3 text-rose-500" />
            Dibatalkan
          </span>
        )}
        {st === "corrected" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <RefreshCw className="w-3 h-3 text-amber-500" />
            Dikoreksi
          </span>
        )}
        {archived && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-500/10 px-1.5 py-0.5 rounded border border-zinc-500/20" title="Diarsipkan dari daftar operasional">
            <Archive className="w-2.5 h-2.5 text-zinc-500" />
            Arsip
          </span>
        )}
      </div>
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
            Pantau seluruh pencatatan penjualan usaha Anda.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <a
            href="/api/export/ledger.xlsx"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-hover text-foreground text-xs font-medium transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Export Excel</span>
          </a>
          <button
            onClick={() => setCatatModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Catat Penjualan</span>
          </button>
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
              <option value="corrected">Dikoreksi</option>
            </select>

            {/* View / Archive Filter */}
            <select
              value={searchParams.get("view") || "active"}
              onChange={(e) => updateParam("view", e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-surface text-foreground focus:outline-none focus:border-primary text-xs"
            >
              <option value="active">Transaksi Aktif</option>
              <option value="archived">Diarsipkan</option>
              <option value="all">Semua (Termasuk Arsip)</option>
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
        <div className="py-12 text-center text-muted bg-surface rounded-xl border border-border space-y-2.5 shadow-xs">
          <Receipt className="w-8 h-8 text-muted mx-auto" />
          <h3 className="text-sm font-semibold text-foreground">
            {searchInput || searchParams.toString()
              ? "Tidak ada transaksi ditemukan"
              : "Belum ada transaksi"}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {searchInput || searchParams.toString()
              ? "Coba ubah kata kunci pencarian atau bersihkan filter yang aktif."
              : "Transaksi yang dicatat melalui Telegram atau dashboard akan muncul di sini."}
          </p>
          {!searchInput && !searchParams.toString() && (
            <div className="pt-1">
              <button
                onClick={() => setCatatModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Penjualan</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-muted/80 uppercase font-mono font-medium tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-border/60">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="hover:bg-surface-hover/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5 text-muted font-mono tabular-nums whitespace-nowrap">
                      {formatTime(tx.transaction_at)}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-foreground whitespace-nowrap">
                      {tx.product_name || "Produk Default"}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono tabular-nums font-medium text-foreground whitespace-nowrap">
                      {tx.quantity} {tx.unit}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono tabular-nums text-muted whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold tracking-tight tabular-nums text-foreground whitespace-nowrap">
                      Rp{new Intl.NumberFormat("id-ID").format(tx.total_amount)}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {sourceBadge(tx.source)}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {statusBadge(tx.status, Boolean(tx.archived_at))}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="relative inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors"
                        >
                          Detail
                        </button>
                        {!tx.archived_at ? (
                          <button
                            type="button"
                            onClick={() => setArchivingTx(tx)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-border hover:border-rose-500/30 hover:bg-rose-500/10 text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Hapus Transaksi (Arsipkan)"
                          >
                            Hapus
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium text-muted bg-surface-hover border border-border">
                            Diarsipkan
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenMenu(e, tx)}
                          className={`p-1.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                            menuAnchor?.tx.id === tx.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-surface hover:bg-surface-hover text-muted hover:text-foreground"
                          }`}
                          title="Lainnya"
                          aria-label="Menu Lainnya"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  <span className="font-semibold text-primary tracking-tight tabular-nums text-sm">
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
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    {sourceBadge(tx.source)}
                    {statusBadge(tx.status, Boolean(tx.archived_at))}
                  </div>
                  <div className="relative flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedTx(tx)}
                      className="px-2.5 py-1 rounded text-xs font-medium border border-border text-foreground hover:bg-surface-hover"
                    >
                      Detail
                    </button>
                    {!tx.archived_at && (
                      <button
                        type="button"
                        onClick={() => setArchivingTx(tx)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-border hover:border-rose-500/30 hover:bg-rose-500/10 text-muted hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        Hapus
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, tx)}
                      className={`p-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        menuAnchor?.tx.id === tx.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                      }`}
                      title="Lainnya"
                      aria-label="Menu Lainnya"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
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

      {/* Edit Transaction Modal */}
      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
        />
      )}

      {/* Void Transaction Modal */}
      {voidingTx && (
        <VoidTransactionModal
          transaction={voidingTx}
          onClose={() => setVoidingTx(null)}
        />
      )}

      {/* Archive / Hapus Transaction Modal */}
      {archivingTx && (
        <ArchiveTransactionModal
          transaction={archivingTx}
          onClose={() => setArchivingTx(null)}
        />
      )}

      {/* Catat Penjualan Modal Component */}
      <CatatPenjualanModal
        isOpen={catatModalOpen}
        onClose={() => setCatatModalOpen(false)}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit || "kg",
          default_price: p.default_price || 0,
          is_default: Boolean(p.is_default),
        }))}
      />

      {/* Action Menu (Lainnya) Backdrop & Menus */}
      {menuAnchor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
            onClick={() => setMenuAnchor(null)}
          />

          {/* Desktop Floating Menu (Viewport-aware fixed positioning, no table clipping) */}
          <div
            style={{
              top: `${menuAnchor.top}px`,
              right: `${menuAnchor.right}px`,
            }}
            className="hidden sm:block fixed w-48 rounded-xl border border-border bg-surface p-1 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
          >
            <button
              type="button"
              disabled={menuAnchor.tx.status !== "confirmed"}
              onClick={() => {
                const tx = menuAnchor.tx;
                setMenuAnchor(null);
                setEditingTx(tx);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                menuAnchor.tx.status === "confirmed"
                  ? "text-foreground hover:bg-surface-hover cursor-pointer"
                  : "text-muted/40 cursor-not-allowed"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Koreksi transaksi</span>
            </button>
            <button
              type="button"
              disabled={menuAnchor.tx.status !== "confirmed"}
              onClick={() => {
                const tx = menuAnchor.tx;
                setMenuAnchor(null);
                setVoidingTx(tx);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                menuAnchor.tx.status === "confirmed"
                  ? "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  : "text-muted/40 cursor-not-allowed"
              }`}
            >
              <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span>Batalkan transaksi</span>
            </button>
          </div>

          {/* Mobile Bottom Action Sheet */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 p-4 bg-surface border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-foreground truncate">
                  {menuAnchor.tx.product_name || "Produk Default"}
                </p>
                <p className="text-[11px] text-muted font-mono">
                  Rp{new Intl.NumberFormat("id-ID").format(menuAnchor.tx.total_amount)} • {menuAnchor.tx.source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuAnchor(null)}
                className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover"
                title="Tutup"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                disabled={menuAnchor.tx.status !== "confirmed"}
                onClick={() => {
                  const tx = menuAnchor.tx;
                  setMenuAnchor(null);
                  setEditingTx(tx);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  menuAnchor.tx.status === "confirmed"
                    ? "bg-surface hover:bg-surface-hover text-foreground border border-border"
                    : "opacity-40 cursor-not-allowed border border-border"
                }`}
              >
                <RefreshCw className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="text-left">
                  <div>Koreksi Transaksi</div>
                  <div className="text-[11px] text-muted font-normal">Buat jurnal penyesuaian baru</div>
                </div>
              </button>

              <button
                type="button"
                disabled={menuAnchor.tx.status !== "confirmed"}
                onClick={() => {
                  const tx = menuAnchor.tx;
                  setMenuAnchor(null);
                  setVoidingTx(tx);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                  menuAnchor.tx.status === "confirmed"
                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    : "opacity-40 cursor-not-allowed border border-border"
                }`}
              >
                <Ban className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-left">
                  <div>Batalkan Transaksi</div>
                  <div className="text-[11px] text-muted font-normal">Reversal jurnal dan kembalikan stok</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

