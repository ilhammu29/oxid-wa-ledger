"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Radio,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  Banknote,
  Search,
  ExternalLink,
} from "lucide-react";

type ConsoleTab = "overview" | "transactions" | "products" | "channels";

export function LedgerConsole() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("overview");

  const tabs = [
    { id: "overview" as ConsoleTab, label: "Ringkasan Kasir", icon: LayoutDashboard },
    { id: "transactions" as ConsoleTab, label: "Mutasi Jurnal", icon: Receipt },
    { id: "products" as ConsoleTab, label: "Katalog & Stok", icon: Package },
    { id: "channels" as ConsoleTab, label: "Bot & Saluran", icon: Radio },
  ];

  return (
    <section id="konsol-produk" className="py-16 sm:py-24 border-b border-border bg-surface/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
                KONSOL OPERASIONAL
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-sans">
              Dashboard yang tenang, presisi, dan terstruktur.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
              Semua mutasi yang masuk dari Telegram langsung tersaji di konsol web.
              Pantau arus kas harian, cek rekonsiliasi, dan ubah harga katalog tanpa hambatan.
            </p>
          </div>

          {/* Tab Pill Switcher */}
          <div className="flex items-center p-1 rounded-lg border border-border bg-surface shrink-0 overflow-x-auto">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-fg font-semibold shadow-xs"
                      : "text-muted hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Realistic Console Frame */}
        <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
          {/* Top Console Bar */}
          <div className="px-4 py-3 border-b border-border bg-surface-hover/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-border" />
                <span className="w-2.5 h-2.5 rounded-full bg-border" />
                <span className="w-2.5 h-2.5 rounded-full bg-border" />
              </div>
              <span className="text-border">|</span>
              <span className="text-xs font-mono text-muted flex items-center gap-1.5">
                <span>app.oxidledger.com/</span>
                <span className="text-foreground font-semibold">
                  {activeTab === "overview" && "dashboard"}
                  {activeTab === "transactions" && "transactions"}
                  {activeTab === "products" && "inventory"}
                  {activeTab === "channels" && "integrations"}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>ONLINE · SYNC REALTIME</span>
              </div>
            </div>
          </div>

          {/* Console Body Area */}
          <div className="p-4 sm:p-6 lg:p-8 bg-background/50">
            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* 4 Metric Tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-surface space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Penjualan Hari Ini</span>
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums font-sans">
                      Rp3.840.000
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                      <span>+18.4%</span>
                      <span className="text-muted">vs kemarin</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-surface space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Saldo Kas Tunai</span>
                      <Banknote className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums font-sans">
                      Rp2.420.000
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      24 transaksi kasir
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-surface space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Transfer Bank (BCA)</span>
                      <CreditCard className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums font-sans">
                      Rp1.420.000
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      6 mutasi terverifikasi
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-surface space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Total Transaksi</span>
                      <Receipt className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-foreground tabular-nums font-sans">
                      30 Pesanan
                    </div>
                    <div className="text-[11px] text-muted font-mono">
                      100% tanpa selisih
                    </div>
                  </div>
                </div>

                {/* Split Operational Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Recent Activity Feed */}
                  <div className="lg:col-span-8 rounded-lg border border-border bg-surface p-4 sm:p-5">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          Aktivitas Kasir Terkini
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-hover text-muted">
                          Live Feed
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted">Auto-Refresh</span>
                    </div>

                    <div className="divide-y divide-border text-xs">
                      {[
                        {
                          id: "TX-2904",
                          time: "08:42:15",
                          sender: "Kasir 01 (Budi)",
                          item: "Lele Konsumsi 5 kg",
                          nominal: "Rp140.000",
                          method: "Tunai",
                          status: "Tercatat",
                        },
                        {
                          id: "TX-2903",
                          time: "08:35:10",
                          sender: "Kasir 01 (Budi)",
                          item: "Pakan Apung 1 sak",
                          nominal: "Rp145.000",
                          method: "Tunai",
                          status: "Tercatat",
                        },
                        {
                          id: "TX-2902",
                          time: "08:12:04",
                          sender: "Kasir 02 (Ahmad)",
                          item: "Nila Segar 8 kg",
                          nominal: "Rp280.000",
                          method: "Transfer BCA",
                          status: "Tercatat",
                        },
                        {
                          id: "TX-2901",
                          time: "07:55:40",
                          sender: "Admin Toko (Siti)",
                          item: "Operasional Es Balok 4 btg",
                          nominal: "Rp60.000",
                          method: "Beban Kas",
                          status: "Tercatat",
                        },
                      ].map((row) => (
                        <div
                          key={row.id}
                          className="py-3 flex items-center justify-between gap-3 hover:bg-surface-hover/50 px-2 rounded transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted text-[11px]">
                              {row.time}
                            </span>
                            <div>
                              <span className="font-medium text-foreground block">
                                {row.item}
                              </span>
                              <span className="text-[11px] text-muted font-mono">
                                #{row.id} · {row.sender}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-foreground tabular-nums block font-sans">
                              {row.nominal}
                            </span>
                            <span className="text-[10px] font-mono text-muted">
                              {row.method}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Cash Reconciliation Status */}
                  <div className="lg:col-span-4 rounded-lg border border-border bg-surface p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="font-bold text-sm text-foreground">
                        Rekonsiliasi Shift Kasir
                      </span>
                      <span className="text-xs font-mono text-emerald-500">Matching</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between text-muted">
                        <span>Modal Awal Kas:</span>
                        <span className="font-mono text-foreground">Rp300.000</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Pemasukan Tunai:</span>
                        <span className="font-mono text-foreground">+Rp2.420.000</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Pengeluaran Kas:</span>
                        <span className="font-mono text-destructive">-Rp60.000</span>
                      </div>
                      <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground">
                        <span>Fisik Kas Diharapkan:</span>
                        <span className="font-sans tabular-nums text-sm">
                          Rp2.660.000
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Seluruh pencatatan kasir klop dengan mutasi bot Telegram. Tidak ada transaksi yang tertinggal.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TRANSACTIONS (MUTASI JURNAL) */}
            {activeTab === "transactions" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      readOnly
                      value="Filter: Semua Transaksi Hari Ini"
                      className="w-full pl-9 pr-3 py-1.5 rounded-md border border-border bg-surface text-xs font-mono text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted">
                    <span>Total Baris: 30</span>
                    <span>·</span>
                    <span className="text-emerald-500">Kompilasi Jurnal Valid</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-[11px] font-mono text-muted uppercase">
                        <th className="pb-2 font-medium">Ref / Waktu</th>
                        <th className="pb-2 font-medium">Akun Debit</th>
                        <th className="pb-2 font-medium">Akun Kredit</th>
                        <th className="pb-2 font-medium">Keterangan / Kasir</th>
                        <th className="pb-2 font-medium text-right">Nominal</th>
                        <th className="pb-2 font-medium text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {[
                        {
                          code: "TX-2904",
                          time: "08:42",
                          debit: "101 - Kas Toko",
                          credit: "401 - Penjualan Lele",
                          desc: "Penjualan 5kg @28rb (Kasir Budi)",
                          amount: "Rp140.000",
                          status: "POSTED",
                        },
                        {
                          code: "TX-2903",
                          time: "08:35",
                          debit: "101 - Kas Toko",
                          credit: "402 - Penjualan Pakan",
                          desc: "Pakan Apung 1 sak (Kasir Budi)",
                          amount: "Rp145.000",
                          status: "POSTED",
                        },
                        {
                          code: "TX-2902",
                          time: "08:12",
                          debit: "102 - Bank BCA",
                          credit: "403 - Penjualan Nila",
                          desc: "Nila Segar 8kg (Kasir Ahmad)",
                          amount: "Rp280.000",
                          status: "POSTED",
                        },
                        {
                          code: "TX-2901",
                          time: "07:55",
                          debit: "501 - Beban Operasional",
                          credit: "101 - Kas Toko",
                          desc: "Es Balok 4 btg (Admin Siti)",
                          amount: "Rp60.000",
                          status: "POSTED",
                        },
                        {
                          code: "TX-2900",
                          time: "07:30",
                          debit: "101 - Kas Toko",
                          credit: "301 - Modal Kas Awal",
                          desc: "Buka Kasir Shift Pagi",
                          amount: "Rp300.000",
                          status: "POSTED",
                        },
                      ].map((item) => (
                        <tr key={item.code} className="hover:bg-surface-hover/60 transition-colors">
                          <td className="py-2.5">
                            <span className="font-semibold text-foreground">#{item.code}</span>
                            <span className="text-muted block text-[10px]">{item.time} WIB</span>
                          </td>
                          <td className="py-2.5 text-foreground">{item.debit}</td>
                          <td className="py-2.5 text-muted">{item.credit}</td>
                          <td className="py-2.5 text-foreground font-sans text-xs">{item.desc}</td>
                          <td className="py-2.5 text-right font-sans font-bold tabular-nums text-foreground">
                            {item.amount}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PRODUCTS & INVENTORY */}
            {activeTab === "products" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-xs font-mono text-muted">
                    Katalog Sinkron dengan Bot Telegram
                  </span>
                  <span className="text-xs font-mono text-primary font-medium">
                    + Tambah Produk via Chat / Web
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      name: "Ikan Lele Segar",
                      sku: "IKN-LLE-01",
                      unit: "kg",
                      price: "Rp28.000",
                      stock: "145 kg",
                      status: "Tersedia",
                    },
                    {
                      name: "Ikan Nila Super",
                      sku: "IKN-NLA-02",
                      unit: "kg",
                      price: "Rp35.000",
                      stock: "68 kg",
                      status: "Tersedia",
                    },
                    {
                      name: "Pakan Nila Starter",
                      sku: "PKN-NLS-01",
                      unit: "sak",
                      price: "Rp150.000",
                      stock: "14 sak",
                      status: "Tersedia",
                    },
                    {
                      name: "Ikan Gurame Hidup",
                      sku: "IKN-GRM-03",
                      unit: "kg",
                      price: "Rp55.000",
                      stock: "22 kg",
                      status: "Menipis",
                    },
                    {
                      name: "Pakan Apung Lele",
                      sku: "PKN-LLE-02",
                      unit: "sak",
                      price: "Rp145.000",
                      stock: "35 sak",
                      status: "Tersedia",
                    },
                    {
                      name: "Bibit Lele Sangkuriang",
                      sku: "BBT-LLE-01",
                      unit: "ekor",
                      price: "Rp250",
                      stock: "5.000 ekor",
                      status: "Tersedia",
                    },
                  ].map((p) => (
                    <div
                      key={p.sku}
                      className="p-4 rounded-lg border border-border bg-surface space-y-2 hover:border-border/90 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">
                          {p.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            p.status === "Menipis"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="text-xs text-muted font-mono flex items-center justify-between">
                        <span>SKU: {p.sku}</span>
                        <span>Satuan: {p.unit}</span>
                      </div>

                      <div className="pt-2 border-t border-border flex items-baseline justify-between">
                        <span className="text-xs text-muted">Stok Fisik:</span>
                        <span className="font-bold text-foreground font-sans tabular-nums">
                          {p.stock}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-muted">Harga Jual:</span>
                        <span className="font-bold text-primary font-sans tabular-nums">
                          {p.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CHANNELS & INTEGRATIONS */}
            {activeTab === "channels" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm text-foreground">
                          Telegram Bot Kasir
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        TERHUBUNG
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      Bot mendengarkan pesan transaksi di grup Telegram kasir internal.
                    </p>

                    <div className="space-y-1.5 text-xs font-mono bg-background p-2.5 rounded border border-border">
                      <div className="flex justify-between text-muted">
                        <span>Bot Username:</span>
                        <span className="text-foreground">@oxid_kasir_bot</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Target Grup ID:</span>
                        <span className="text-foreground">-100284910284</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Latensi Webhook:</span>
                        <span className="text-emerald-500">~180ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-lg border border-border bg-surface space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-sm text-foreground">
                          Google Sheets Mirror
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                        TERHUBUNG
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">
                      Setiap mutasi kasir otomatis di-append ke baris baru spreadsheet Google Anda.
                    </p>

                    <div className="space-y-1.5 text-xs font-mono bg-background p-2.5 rounded border border-border">
                      <div className="flex justify-between text-muted">
                        <span>Nama Spreadsheet:</span>
                        <span className="text-foreground truncate max-w-[170px]">
                          Pembukuan_Toko_2026
                        </span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Total Baris Tercermin:</span>
                        <span className="text-foreground">1.842 baris</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Status Sinkron:</span>
                        <span className="text-emerald-500">Otomatis / Realtime</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Console Footer Status */}
          <div className="px-4 py-3 border-t border-border bg-surface-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <span className="text-muted text-[11px] font-mono">
              Konsol dapat diakses dari browser desktop, tablet, ataupun ponsel admin.
            </span>
            <span className="text-primary font-mono text-[11px] font-medium flex items-center gap-1">
              <span>Data Riil Terisolasi per Bisnis (RLS)</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
