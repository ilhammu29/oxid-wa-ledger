"use client";

import { useState } from "react";
import Link from "next/link";
import {
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

interface RecentTransactionsTableProps {
  transactions: TransactionRowData[];
  timezone: string;
}

export function RecentTransactionsTable({
  transactions,
  timezone,
}: RecentTransactionsTableProps) {
  const [selectedTx, setSelectedTx] = useState<TransactionRowData | null>(null);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(d);
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
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono">
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
          WhatsApp
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono">
        Dashboard
      </span>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted bg-surface rounded-xl border border-border space-y-2">
        <Receipt className="w-8 h-8 text-muted mx-auto" />
        <p className="text-sm font-semibold text-foreground">Belum ada transaksi tercatat</p>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Kirim pesan penjualan via Telegram atau gunakan tombol Catat Penjualan di atas.
        </p>
        <div className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-surface-hover border border-border text-xs text-foreground font-mono">
          Contoh: &ldquo;Kejual lele 10kg&rdquo;
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-hover/60 text-muted uppercase font-semibold tracking-wider text-[11px]">
              <th className="py-2.5 px-3.5">Waktu</th>
              <th className="py-2.5 px-3.5">Produk</th>
              <th className="py-2.5 px-3.5">Qty</th>
              <th className="py-2.5 px-3.5">Harga</th>
              <th className="py-2.5 px-3.5">Total</th>
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

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
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
                {tx.quantity} {tx.unit} @ Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
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

      <div className="mt-3 flex justify-end">
        <Link
          href="/dashboard/transactions"
          className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
        >
          Lihat Semua Transaksi & Filter
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <TransactionDetailModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
        timezone={timezone}
      />
    </>
  );
}
