"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminBusinessListItem } from "@/modules/subscriptions/admin";
import {
  Search,
  ArrowRight,
} from "lucide-react";

interface AdminBusinessesClientViewProps {
  businesses: AdminBusinessListItem[];
}

export function AdminBusinessesClientView({ businesses }: AdminBusinessesClientViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBusinesses = businesses.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      b.name.toLowerCase().includes(q) ||
      b.id.toLowerCase().includes(q) ||
      (b.category && b.category.toLowerCase().includes(q)) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
      b.planName.toLowerCase().includes(q);

    if (statusFilter === "all") return matchesSearch;
    return matchesSearch && b.subscriptionStatus === statusFilter;
  });

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "-";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(isoStr));
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "trialing":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "grace_period":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "suspended":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. SEARCH & FILTER TOOLBAR
      ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama bisnis, ID, kategori, atau owner..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-card border border-border text-xs text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">Semua Status ({businesses.length})</option>
            <option value="active">Aktif</option>
            <option value="trialing">Trialing</option>
            <option value="grace_period">Masa Tenggang</option>
            <option value="suspended">Ditangguhkan</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DATA TABLE FOR DESKTOP & TABLET (>= 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Bisnis & Tenant</th>
                <th className="py-3 px-4">Paket</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Onboarding & Integrasi</th>
                <th className="py-3 px-4">Masa Berlaku</th>
                <th className="py-3 px-4 text-right">Sisa Hari</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada tenant bisnis yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => {
                  const pct = b.onboardingPercentage ?? 0;
                  const isComplete = pct === 100;

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block"
                        >
                          {b.name}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          {b.category && (
                            <span className="capitalize">{b.category}</span>
                          )}
                          <span>·</span>
                          <span className="font-mono text-[10px]">{b.id}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium capitalize text-foreground">
                        {b.planName}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                            b.subscriptionStatus
                          )}`}
                        >
                          {b.subscriptionStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isComplete
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-sky-500/10 text-sky-500"
                            }`}
                          >
                            {pct}%
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span
                              className={b.telegramConnected ? "text-sky-500 font-medium" : "text-muted-foreground/40"}
                              title="Telegram Bot"
                            >
                              TG
                            </span>
                            <span>·</span>
                            <span
                              className={b.firstTransactionRecorded ? "text-emerald-500 font-medium" : "text-muted-foreground/40"}
                              title="Transaksi Pertama"
                            >
                              Tx
                            </span>
                            <span>·</span>
                            <span
                              className={b.googleSheetsConnected ? "text-emerald-500 font-medium" : "text-muted-foreground/40"}
                              title="Google Sheets"
                            >
                              Sheets
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(b.currentPeriodEnd)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-foreground">
                        {b.remainingDays} hari
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border text-xs font-medium transition-colors"
                        >
                          <span>Detail</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. RESPONSIVE STRUCTURED CARDS FOR MOBILE (< 768px)
      ────────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {filteredBusinesses.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground">
            Tidak ada bisnis yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredBusinesses.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/businesses/${b.id}`}
                    className="font-bold text-sm text-foreground hover:text-primary transition-colors block"
                  >
                    {b.name}
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    {b.category && <span className="capitalize">{b.category}</span>}
                    <span>·</span>
                    <span className="font-mono text-[11px]">{b.id}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${getStatusBadge(
                    b.subscriptionStatus
                  )}`}
                >
                  {b.subscriptionStatus}
                </span>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Paket:</span>
                  <span className="font-semibold text-foreground capitalize">{b.planName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Sisa Aktif:</span>
                  <span className="font-mono font-semibold tabular-nums text-foreground">
                    {b.remainingDays} hari
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Onboarding:</span>
                  <span className="font-medium text-foreground">{b.onboardingPercentage}%</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Kanal:</span>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={b.telegramConnected ? "text-sky-500 font-medium" : "text-muted-foreground/40"}>
                      TG
                    </span>
                    <span>·</span>
                    <span className={b.googleSheetsConnected ? "text-emerald-500 font-medium" : "text-muted-foreground/40"}>
                      Sheets
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/admin/businesses/${b.id}`}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border text-xs font-semibold transition-colors"
              >
                <span>Buka Detail Operasional</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
