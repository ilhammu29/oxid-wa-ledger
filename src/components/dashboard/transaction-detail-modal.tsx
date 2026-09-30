"use client";

import { useEffect, useState } from "react";
import { X, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface TransactionRowData {
  id: string;
  transaction_at: string;
  product_id?: string | null;
  product_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  source: string;
  status: "confirmed" | "cancelled" | "corrected";
  raw_message?: string | null;
}

interface AuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  source: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
}

interface TransactionDetailModalProps {
  transaction: TransactionRowData | null;
  onClose: () => void;
  timezone?: string;
}

export function TransactionDetailModal({
  transaction,
  onClose,
  timezone = "Asia/Jakarta",
}: TransactionDetailModalProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!transaction) return;

    let isMounted = true;
    const supabase = createClient();

    supabase
      .from("transaction_events")
      .select("id, event_type, created_at, source, old_values, new_values")
      .eq("transaction_id", transaction.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isMounted) return;
        setLoadingEvents(false);
        if (!error && data) {
          setEvents(data as unknown as AuditEvent[]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [transaction]);

  if (!transaction) return null;

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone,
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const statusBadge = () => {
    switch (transaction.status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Terkonfirmasi
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Dibatalkan
          </span>
        );
      case "corrected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
            Dikoreksi
          </span>
        );
    }
  };

  const sourceBadge = (src: string) => {
    const s = src.toLowerCase();
    let label = src;
    if (s === "telegram") label = "Telegram Bot";
    if (s === "whatsapp") label = "WhatsApp";
    if (s === "dashboard") label = "Web Dashboard";

    return (
      <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-mono text-xs border border-zinc-200">
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-lg w-full overflow-hidden text-zinc-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div>
            <h3 className="text-base font-bold text-zinc-900 tracking-tight">
              Rincian Transaksi
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              ID: {transaction.id.slice(0, 8)}...{transaction.id.slice(-4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Financial Card */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Total Nilai Transaksi
                </p>
                <p className="text-2xl font-bold text-zinc-950 font-mono">
                  Rp{new Intl.NumberFormat("id-ID").format(transaction.total_amount)}
                </p>
              </div>
              <div>{statusBadge()}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-200 text-xs">
              <div>
                <p className="text-zinc-500 font-medium">Produk</p>
                <p className="font-semibold text-zinc-800">
                  {transaction.product_name || "Produk Default"}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 font-medium">Kuantitas & Harga</p>
                <p className="font-semibold text-zinc-800 font-mono">
                  {transaction.quantity} {transaction.unit} × Rp
                  {new Intl.NumberFormat("id-ID").format(transaction.unit_price)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 font-medium">Channel / Sumber</p>
                <div className="mt-0.5">{sourceBadge(transaction.source)}</div>
              </div>
              <div>
                <p className="text-zinc-500 font-medium">Waktu Transaksi</p>
                <p className="font-medium text-zinc-800 mt-0.5">
                  {formatDate(transaction.transaction_at)}
                </p>
              </div>
            </div>

            {transaction.raw_message && (
              <div className="pt-2 border-t border-zinc-200 text-xs">
                <p className="text-zinc-500 font-medium mb-0.5">Pesan Asli Masuk:</p>
                <p className="bg-white p-2 rounded-lg border border-zinc-200 text-zinc-700 italic font-mono text-[11px]">
                  &ldquo;{transaction.raw_message}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Audit Trail Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Riwayat Audit Ledger (Transaction Events)
              </h4>
            </div>

            {loadingEvents ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                Memuat riwayat audit...
              </div>
            ) : events.length === 0 ? (
              <div className="py-3 text-center text-xs text-zinc-400 bg-zinc-50 rounded-lg border border-zinc-100">
                Belum ada data audit tambahan.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-3 rounded-lg border border-zinc-200 bg-white text-xs flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 font-mono uppercase text-[11px]">
                          [{ev.event_type}]
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          via {ev.source}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {formatDate(ev.created_at)}
                      </p>
                    </div>
                    {ev.event_type === "created" && (
                      <span className="text-emerald-600 font-medium text-[11px]">
                        Terkonfirmasi awal
                      </span>
                    )}
                    {ev.event_type === "cancelled" && (
                      <span className="text-red-600 font-medium text-[11px]">
                        Dibatalkan
                      </span>
                    )}
                    {ev.event_type === "corrected" && (
                      <span className="text-amber-600 font-medium text-[11px]">
                        Koreksi nilai
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
