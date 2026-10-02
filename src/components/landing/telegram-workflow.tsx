"use client";

import { useState } from "react";
import { Send, Bot, CheckCheck, Clock, FileSpreadsheet, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface WorkflowStep {
  id: string;
  tabTitle: string;
  tabIcon: React.ElementType;
  badge: string;
  userMessage: string;
  userTime: string;
  botReply: {
    title: string;
    items: { label: string; value: string }[];
    total: string;
    footnote?: string;
  };
  botTime: string;
  explanation: {
    heading: string;
    description: string;
    bulletPoints: string[];
  };
}

const WORKFLOWS: WorkflowStep[] = [
  {
    id: "sale",
    tabTitle: "Catat Penjualan",
    tabIcon: Send,
    badge: "Input Percakapan Alami",
    userMessage: "lele 15kg kirim warung barokah lunas",
    userTime: "14:21",
    botReply: {
      title: "✅ Transaksi Berhasil Dicatat",
      items: [
        { label: "Produk", value: "Lele Segar (15 kg)" },
        { label: "Harga Satuan", value: "Rp 25.000 / kg" },
        { label: "Pelanggan", value: "Warung Barokah" },
        { label: "Status Bayar", value: "Lunas (Kas)" },
      ],
      total: "Rp 375.000",
      footnote: "Buku besar diperbarui • Cermin Google Sheets disinkronkan",
    },
    botTime: "14:21",
    explanation: {
      heading: "Mesin Parser Mengenali Bahasa Sehari-hari",
      description:
        "Operator atau kasir cukup mengirim chat tanpa perlu membuka form rumit. OXID mencocokkan alias produk, menghitung harga total rupiah tanpa selisih desimal, dan merekam nomor invoice otomatis.",
      bulletPoints: [
        "Mendukung nama alias produk yang fleksibel",
        "Penanganan kuantitas desimal (misal 2,5 kg)",
        "Isolasi tenant terjamin dengan RLS Supabase",
      ],
    },
  },
  {
    id: "reminder",
    tabTitle: "Pengingat & Rekap",
    tabIcon: Clock,
    badge: "Otomasi Tutup Buku",
    userMessage: "laporan hari ini",
    userTime: "18:05",
    botReply: {
      title: "📊 Rekap Tutup Buku — 02 Okt 2026",
      items: [
        { label: "Total Transaksi", value: "14 transaksi" },
        { label: "Volume Produk", value: "128,5 kg terjual" },
        { label: "Pembayaran Lunas", value: "Rp 3.212.500" },
        { label: "Piutang Berjalan", value: "Rp 0 (Nihil)" },
      ],
      total: "Omzet: Rp 3.212.500",
      footnote: "Semua data aman • Klik /status untuk rincian per produk",
    },
    botTime: "18:05",
    explanation: {
      heading: "Pengingat Jadwal & Rekap Tanpa Menghitung Manual",
      description:
        "Bot mengirim notifikasi terjadwal di jam operasional yang Anda tentukan. Pemilik bisnis langsung mendapatkan gambaran omzet harian tanpa harus merekap nota satu per satu di malam hari.",
      bulletPoints: [
        "Jadwal pengingat dapat diatur per zona waktu bisnis",
        "Laporan instan kapan pun diminta (/laporan)",
        "Mencegah transaksi tercecer atau lupa dicatat",
      ],
    },
  },
  {
    id: "sheets",
    tabTitle: "Cermin Spreadsheet",
    tabIcon: FileSpreadsheet,
    badge: "Sinkronisasi Real-Time",
    userMessage: "pakan lele 2 sak transfer bank",
    userTime: "15:40",
    botReply: {
      title: "✅ Transaksi Disimpan & Terkoneksi",
      items: [
        { label: "Produk", value: "Pakan Lele Super (2 Sak)" },
        { label: "Harga Satuan", value: "Rp 380.000 / sak" },
        { label: "Metode", value: "Transfer Bank" },
        { label: "Sheet Row", value: "Baris #412 ditambahkan" },
      ],
      total: "Rp 760.000",
      footnote: "Google Spreadsheet terhubung terisi otomatis",
    },
    botTime: "15:40",
    explanation: {
      heading: "Google Sheets Selalu Sinkron Satu Arah",
      description:
        "Setiap penjualan yang masuk ke Telegram langsung dicerminkan ke Google Sheets usaha Anda secara instan. Mitra atau staf kantor yang lebih nyaman memantau lewat Excel tetap bisa melihat data terkini.",
      bulletPoints: [
        "Koneksi OAuth aman dan terisolasi per akun",
        "Format kolom rapi: Waktu, Invoice, Qty, Total",
        "Database PostgreSQL tetap menjadi sumber otoritatif",
      ],
    },
  },
];

export function TelegramWorkflow() {
  const [activeTab, setActiveTab] = useState("sale");

  const current = WORKFLOWS.find((w) => w.id === activeTab) || WORKFLOWS[0];

  return (
    <div className="w-full">
      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {WORKFLOWS.map((w) => {
          const Icon = w.tabIcon;
          const isActive = w.id === activeTab;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveTab(w.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-fg shadow-sm"
                  : "bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{w.tabTitle}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left / Telegram Chat Window Mockup */}
        <div className="lg:col-span-7 bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between">
          {/* Mock Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-foreground">OXID Ledger Bot</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-subtle text-primary font-medium">
                    Resmi
                  </span>
                </div>
                <p className="text-[11px] text-muted">Aktif • Waktu respons &lt; 1 detik</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-muted bg-surface-hover px-2.5 py-1 rounded-md border border-border">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>TERVERIFIKASI</span>
            </div>
          </div>

          {/* Chat Bubble Area */}
          <div className="space-y-4 py-2">
            {/* Operator Outgoing Bubble */}
            <div className="flex flex-col items-end">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-primary text-primary-fg px-4 py-2.5 shadow-xs">
                <p className="text-xs sm:text-sm font-medium leading-relaxed font-sans">
                  {current.userMessage}
                </p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-80">
                  <span>{current.userTime}</span>
                  <CheckCheck className="w-3 h-3" />
                </div>
              </div>
              <span className="text-[10px] text-muted mt-1 mr-1">Operator Kasir</span>
            </div>

            {/* OXID Bot Incoming Bubble */}
            <div className="flex flex-col items-start">
              <div className="max-w-[90%] sm:max-w-[82%] rounded-2xl rounded-tl-xs bg-surface-hover border border-border px-4 py-3 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2 pb-1.5 border-b border-border">
                  <span>{current.botReply.title}</span>
                </div>

                <div className="space-y-1.5 text-xs mb-3">
                  {current.botReply.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] sm:text-xs">
                      <span className="text-muted">{item.label}</span>
                      <span className="font-semibold text-foreground text-right">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted uppercase">Total Nilai</span>
                  <span className="text-xs sm:text-sm font-bold text-primary font-mono">
                    {current.botReply.total}
                  </span>
                </div>

                {current.botReply.footnote && (
                  <p className="mt-2 text-[10px] text-muted italic flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                    <span>{current.botReply.footnote}</span>
                  </p>
                )}

                <div className="flex items-center justify-end mt-1 text-[10px] text-muted">
                  <span>{current.botTime}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted mt-1 ml-1">OXID Telegram Engine</span>
            </div>
          </div>

          {/* Chat Mock Input Bar */}
          <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
            <div className="flex-1 bg-surface-hover border border-border rounded-xl px-3.5 py-2 text-xs text-muted font-sans flex items-center justify-between">
              <span>Ketik pesan atau /bantuan...</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border">
                Kirim
              </span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-fg flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Right / Explanation & Highlights */}
        <div className="lg:col-span-5 bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-subtle text-primary text-[11px] font-semibold mb-4">
              <span>{current.badge}</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-2">
              {current.explanation.heading}
            </h3>

            <p className="text-xs sm:text-sm text-muted leading-relaxed mb-6">
              {current.explanation.description}
            </p>

            <div className="space-y-3">
              {current.explanation.bulletPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground">
                  <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <ArrowRight className="w-2.5 h-2.5" />
                  </div>
                  <span className="leading-normal">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Siap mencoba di usaha Anda?</span>
              <span className="font-semibold text-primary">Uji Coba 14 Hari Gratis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
