"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  FileSpreadsheet,
  Database,
  Smartphone,
  Receipt,
  MessageSquare,
} from "lucide-react";

interface LedgerHeroProps {
  isAuthenticated: boolean;
}

interface Scenario {
  id: string;
  tabLabel: string;
  sender: string;
  time: string;
  rawChat: string;
  txCode: string;
  type: "sale" | "expense";
  parsedTokens: { label: string; value: string }[];
  journal: {
    debit: string;
    credit: string;
    amount: string;
    inventoryChange?: string;
  };
  syncStatus: {
    bot: string;
    database: string;
    sheets: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: "sale-retail",
    tabLabel: "Penjualan Retail",
    sender: "Budi (Kasir 01)",
    time: "08:42:15 WIB",
    rawChat: "Kejual lele 5kg @28rb tunai",
    txCode: "TX-2904",
    type: "sale",
    parsedTokens: [
      { label: "Produk", value: "Ikan Lele Segar" },
      { label: "Volume", value: "5 kg" },
      { label: "Harga Satuan", value: "Rp28.000" },
      { label: "Metode Bayar", value: "Kas Tunai" },
    ],
    journal: {
      debit: "101 - Kas Toko",
      credit: "401 - Pendapatan Penjualan",
      amount: "Rp140.000",
      inventoryChange: "Stok Lele: -5 kg",
    },
    syncStatus: {
      bot: "Struk Telegram terkirim ke kasir",
      database: "ACID PostgreSQL commit (0.34s)",
      sheets: "Baris #184 ditambahkan di Google Sheets",
    },
  },
  {
    id: "expense-feed",
    tabLabel: "Biaya Operasional",
    sender: "Siti (Admin Toko)",
    time: "11:15:30 WIB",
    rawChat: "Beli pakan nila 2 sak 150rb tunai",
    txCode: "TX-2905",
    type: "expense",
    parsedTokens: [
      { label: "Kategori", value: "Beban Operasional" },
      { label: "Barang", value: "Pakan Nila Starter" },
      { label: "Jumlah", value: "2 sak" },
      { label: "Total Biaya", value: "Rp300.000" },
    ],
    journal: {
      debit: "502 - Beban Pakan & Logistik",
      credit: "101 - Kas Toko",
      amount: "Rp300.000",
      inventoryChange: "Stok Pakan: +2 sak",
    },
    syncStatus: {
      bot: "Notifikasi beban tercatat ke owner",
      database: "PostgreSQL ledger terverifikasi",
      sheets: "Sheet Pengeluaran otomatis ter-update",
    },
  },
  {
    id: "sale-transfer",
    tabLabel: "Grosir Transfer",
    sender: "Ahmad (Kasir 02)",
    time: "14:05:42 WIB",
    rawChat: "Nila konsumsi 12kg @35rb transfer BCA lunas",
    txCode: "TX-2906",
    type: "sale",
    parsedTokens: [
      { label: "Produk", value: "Ikan Nila Segar" },
      { label: "Volume", value: "12 kg" },
      { label: "Harga Satuan", value: "Rp35.000" },
      { label: "Metode Bayar", value: "Bank BCA (Transfer)" },
    ],
    journal: {
      debit: "102 - Bank BCA Giro",
      credit: "401 - Pendapatan Penjualan",
      amount: "Rp420.000",
      inventoryChange: "Stok Nila: -12 kg",
    },
    syncStatus: {
      bot: "Struk digital diteruskan ke pelanggan",
      database: "Integrasi mutasi perbankan matching",
      sheets: "Laporan harian terekap seketika",
    },
  },
];

export function LedgerHero({ isAuthenticated }: LedgerHeroProps) {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("sale-retail");
  const scenario =
    SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  return (
    <section className="relative pt-8 pb-16 sm:pt-14 sm:pb-24 border-b border-border bg-background overflow-hidden">
      {/* Structural Hairline Grid - Subdued background texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* LEFT COLUMN: Editorial Presentation (55%) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Operational Category Stamp */}
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                OPERASIONAL TELEGRAM-FIRST · BUKU BESAR KASIR
              </span>
            </div>

            {/* Unequal Typographic Scale Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] leading-[1.15] tracking-tight text-foreground font-sans">
              <span className="block font-medium text-muted">
                Catat penjualan di chat.
              </span>
              <span className="block font-bold text-foreground mt-1">
                Operasional rapi di buku besar.
              </span>
            </h1>

            {/* Factual, Jargon-Free Description */}
            <p className="mt-5 text-sm sm:text-base text-muted leading-relaxed max-w-2xl font-sans">
              Kasir cukup mengetik pesan seperti biasa di grup Telegram toko. Bot
              memvalidasi harga satuan, memotong kuantitas stok barang, dan
              membukukan jurnal akuntansi double-entry secara otomatis tanpa
              perlu mesin kasir mahal.
            </p>

            {/* Dual Compact Action Row */}
            <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href={isAuthenticated ? "/dashboard" : "/signup"}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary hover:bg-primary-hover text-primary-fg font-semibold text-sm shadow-xs transition-colors cursor-pointer"
              >
                <span>{isAuthenticated ? "Buka Dashboard Kasir" : "Mulai Uji Coba 14 Hari"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#alur-transaksi"
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground font-medium text-sm transition-colors cursor-pointer"
              >
                <span>Lihat Alur Kerja</span>
                <ArrowDown className="w-3.5 h-3.5 text-muted" />
              </a>
            </div>

            {/* Guarantee / Free Trial Note */}
            <div className="mt-3 flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tanpa kartu kredit</span>
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Langsung siap dalam 2 menit</span>
              </span>
            </div>

            {/* Operational Proof Metric Strip */}
            <div className="mt-10 pt-8 border-t border-border grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-foreground font-semibold text-base sm:text-lg tracking-tight">
                  <Smartphone className="w-4 h-4 text-muted" />
                  <span>0 Hardware</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted leading-tight">
                  Cukup smartphone Android/iPhone yang sudah dimiliki kasir.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-foreground font-semibold text-base sm:text-lg tracking-tight">
                  <Database className="w-4 h-4 text-muted" />
                  <span>PostgreSQL</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted leading-tight">
                  ACID-compliant double entry ledger, aman dari data ganda.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-foreground font-semibold text-base sm:text-lg tracking-tight">
                  <FileSpreadsheet className="w-4 h-4 text-muted" />
                  <span>Google Sheets</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted leading-tight">
                  Cermin data instan untuk pembukuan akuntan dan arsip pemilik.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Transaction Transformation Rail (45%) */}
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
              {/* Rail Header with Live Indicator & Scenario Switcher */}
              <div className="px-4 py-3 border-b border-border bg-surface-hover flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-mono font-medium text-foreground">
                    TRANSACTION ENGINE
                  </span>
                  <span className="text-[10px] font-mono text-muted uppercase">
                    v2.4
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
                  <span className="text-foreground font-semibold">#{scenario.txCode}</span>
                </div>
              </div>

              {/* Scenario Selector Tabs */}
              <div className="p-2 border-b border-border bg-background/50 flex items-center gap-1">
                {SCENARIOS.map((s) => {
                  const isActive = s.id === activeScenarioId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveScenarioId(s.id)}
                      className={`flex-1 py-1.5 px-2 text-center rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-surface text-foreground font-semibold shadow-2xs border border-border"
                          : "text-muted hover:text-foreground hover:bg-surface/50"
                      }`}
                    >
                      {s.tabLabel}
                    </button>
                  );
                })}
              </div>

              {/* The Step-by-Step Pipeline Transformation Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* STAGE 1: Chat Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span>01. Input Pesan Kasir</span>
                    </span>
                    <span>{scenario.time}</span>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="text-[11px] font-mono text-muted mb-1 flex items-center justify-between">
                      <span className="font-semibold text-foreground">{scenario.sender}</span>
                      <span className="text-[10px]">via Telegram Bot</span>
                    </div>
                    <div className="font-mono text-sm text-foreground font-medium bg-surface/80 px-2.5 py-1.5 rounded border border-border/70">
                      &quot;{scenario.rawChat}&quot;
                    </div>
                  </div>
                </div>

                {/* STAGE 2: Parsed Entity Chips */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-primary" />
                      <span>02. Ekstraksi Entitas & Validasi</span>
                    </span>
                    <span className="text-emerald-500 font-medium">Valid (100%)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {scenario.parsedTokens.map((token, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-border/80 bg-background/60 p-2 text-xs"
                      >
                        <span className="block text-[10px] font-mono text-muted uppercase">
                          {token.label}
                        </span>
                        <span className="font-medium text-foreground tracking-tight">
                          {token.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* STAGE 3: Double-Entry Ledger Posting */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      <span>03. Jurnal Buku Kas Resmi</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      TERBUKUKAN
                    </span>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3 space-y-2">
                    <div className="flex items-baseline justify-between pb-2 border-b border-border/60">
                      <span className="text-xs text-muted">Nominal Transaksi</span>
                      <span className="text-lg font-bold text-foreground tracking-tight tabular-nums font-sans">
                        {scenario.journal.amount}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono space-y-1 text-muted">
                      <div className="flex justify-between">
                        <span>Debit:</span>
                        <span className="text-foreground">{scenario.journal.debit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kredit:</span>
                        <span className="text-foreground">{scenario.journal.credit}</span>
                      </div>
                      {scenario.journal.inventoryChange && (
                        <div className="flex justify-between pt-1 border-t border-border/40 text-emerald-600 dark:text-emerald-400">
                          <span>Mutasi Stok:</span>
                          <span className="font-semibold">
                            {scenario.journal.inventoryChange}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* STAGE 4: Multi-Channel Synchronization */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-mono text-muted flex items-center justify-between">
                    <span>04. Konfirmasi & Sinkronisasi</span>
                    <span className="text-[10px] text-muted">3/3 Saluran Aktif</span>
                  </div>

                  <div className="rounded-lg border border-border bg-background/50 p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2 text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{scenario.syncStatus.bot}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{scenario.syncStatus.database}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{scenario.syncStatus.sheets}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Interactive Prompt */}
              <div className="px-4 py-2.5 border-t border-border bg-surface-hover/80 flex items-center justify-between text-[11px] text-muted font-mono">
                <span>Klik tab di atas untuk menguji skenario lain</span>
                <span className="text-primary font-medium">Deterministic</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
