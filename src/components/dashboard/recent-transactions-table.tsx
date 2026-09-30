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

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-400 bg-white rounded-xl border border-zinc-200">
        <Receipt className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
        <p className="text-sm font-medium text-zinc-600">Belum ada transaksi</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          Kirim pesan penjualan via Telegram / WhatsApp atau gunakan tombol Catat Penjualan.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-600 uppercase font-semibold tracking-wider text-[11px]">
              <th className="py-3 px-4">Waktu</th>
              <th className="py-3 px-4">Produk</th>
              <th className="py-3 px-4">Qty</th>
              <th className="py-3 px-4">Harga</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Source</th>
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
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href="/dashboard/transactions"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 transition-colors"
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
