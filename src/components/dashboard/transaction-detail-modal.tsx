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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Terkonfirmasi
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Dibatalkan
          </span>
        );
      case "corrected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
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
      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-xs border border-primary/20">
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface rounded-xl border border-border shadow-xl max-w-lg w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface-hover/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Rincian Transaksi
            </h3>
            <p className="text-xs text-muted font-mono">
              ID: {transaction.id.slice(0, 8)}...{transaction.id.slice(-4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Main Financial Card */}
          <div className="rounded-xl border border-border bg-surface-hover/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted">
                  Total Nilai Transaksi
                </p>
                <p className="text-2xl font-bold text-primary font-mono mt-0.5">
                  Rp{new Intl.NumberFormat("id-ID").format(transaction.total_amount)}
                </p>
              </div>
              <div>{statusBadge()}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
              <div>
                <p className="text-muted font-medium">Produk</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {transaction.product_name || "Produk Default"}
                </p>
              </div>
              <div>
                <p className="text-muted font-medium">Kuantitas & Harga</p>
                <p className="font-semibold text-foreground font-mono mt-0.5">
                  {transaction.quantity} {transaction.unit} × Rp
                  {new Intl.NumberFormat("id-ID").format(transaction.unit_price)}
                </p>
              </div>
              <div>
                <p className="text-muted font-medium">Channel / Sumber</p>
                <div className="mt-1">{sourceBadge(transaction.source)}</div>
              </div>
              <div>
                <p className="text-muted font-medium">Waktu Transaksi</p>
                <p className="font-medium text-foreground mt-0.5">
                  {formatDate(transaction.transaction_at)}
                </p>
              </div>
            </div>

            {transaction.raw_message && (
              <div className="pt-2 border-t border-border text-xs">
                <p className="text-muted font-medium mb-1">Pesan Asli Masuk:</p>
                <p className="bg-surface p-2.5 rounded-lg border border-border text-muted italic font-mono text-[11px]">
                  &ldquo;{transaction.raw_message}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Audit Trail Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Riwayat Audit Ledger (Transaction Events)
              </h4>
            </div>

            {loadingEvents ? (
              <div className="py-4 text-center text-xs text-muted">
                Memuat riwayat audit...
              </div>
            ) : events.length === 0 ? (
              <div className="py-3 text-center text-xs text-muted bg-surface rounded-lg border border-border">
                Belum ada data audit tambahan.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-3 rounded-lg border border-border bg-surface text-xs flex items-start justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary font-mono uppercase text-[11px]">
                          [{ev.event_type}]
                        </span>
                        <span className="text-[11px] text-muted">
                          via {ev.source}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        {formatDate(ev.created_at)}
                      </p>
                    </div>
                    {ev.event_type === "created" && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                        Terkonfirmasi awal
                      </span>
                    )}
                    {ev.event_type === "cancelled" && (
                      <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                        Dibatalkan
                      </span>
                    )}
                    {ev.event_type === "corrected" && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
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
        <div className="px-5 py-3 bg-surface-hover/40 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-border text-foreground hover:bg-surface-hover text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
