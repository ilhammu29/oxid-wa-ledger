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
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Berhasil
        </span>
      );
    }
    if (st === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
          <XCircle className="w-3 h-3 text-rose-400" />
          Dibatalkan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
        <RefreshCw className="w-3 h-3 text-amber-400" />
        Koreksi
      </span>
    );
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    if (s === "telegram") {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
          Telegram
        </span>
      );
    }
    if (s === "whatsapp") {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          WhatsApp
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
        Dashboard
      </span>
    );
  };

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 bg-[#111726] rounded-2xl border border-white/[0.08] space-y-2">
        <Receipt className="w-8 h-8 text-slate-500 mx-auto" />
        <p className="text-sm font-semibold text-white">Belum ada transaksi tercatat</p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Kirim pesan penjualan via Telegram atau gunakan tombol Catat Penjualan di atas.
        </p>
        <div className="inline-block mt-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 font-mono">
          Contoh: &ldquo;Kejual lele 10kg&rdquo;
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111726] shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#161F33] text-slate-400 uppercase font-semibold tracking-wider text-[11px]">
              <th className="py-3 px-4">Waktu</th>
              <th className="py-3 px-4">Produk</th>
              <th className="py-3 px-4">Qty</th>
              <th className="py-3 px-4">Harga</th>
              <th className="py-3 px-4">Total</th>
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

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2.5">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            onClick={() => setSelectedTx(tx)}
            className="p-3.5 rounded-2xl bg-[#111726] border border-white/[0.08] hover:border-violet-500/30 active:scale-[0.99] transition-all space-y-2 cursor-pointer shadow-sm"
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
                {tx.quantity} {tx.unit} @ Rp{new Intl.NumberFormat("id-ID").format(tx.unit_price)}
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

      <div className="mt-3 flex justify-end">
        <Link
          href="/dashboard/transactions"
          className="text-xs font-semibold text-violet-400 hover:text-violet-300 inline-flex items-center gap-1 transition-colors"
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
