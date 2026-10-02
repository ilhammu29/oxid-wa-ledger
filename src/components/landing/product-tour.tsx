"use client";

import { useState } from "react";
import {
  Bot,
  Layers,
  Send,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

export function ProductTour() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      icon: Bot,
      shortTitle: "Hubungkan Telegram",
      title: "Hubungkan bot Telegram usaha Anda",
      desc: "Dapatkan token pairing sekali pakai dari dashboard web, lalu kirimkan ke bot Telegram OXID Ledger. Bot langsung aktif tanpa konfigurasi webhook rumit.",
    },
    {
      num: "02",
      icon: Layers,
      shortTitle: "Atur Produk & Alias",
      title: "Daftarkan produk dan singkatan kasir",
      desc: "Masukkan produk jualan beserta alias singkatan umum (seperti 'lele', 'ayam-p', 'LL'). Operator bebas mengetik tanpa harus mengingat kode barang yang kaku.",
    },
    {
      num: "03",
      icon: Send,
      shortTitle: "Catat via Chat",
      title: "Kirim catatan secepat mengetik chat",
      desc: "Kasir cukup mengirim pesan singkat ke bot Telegram: 'lele 4kg 26rb lunas'. Sistem membaca jumlah, nama produk, harga, dan metode bayar secara akurat.",
    },
    {
      num: "04",
      icon: FileSpreadsheet,
      shortTitle: "Cermin & Laporan",
      title: "Data rapi di web dan Google Sheets",
      desc: "Setiap transaksi otomatis dibukukan ke database terisolasi dan dicerminkan langsung ke Google Sheets usaha Anda secara real-time.",
    },
  ];

  return (
    <section id="cara-kerja" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Alur Kerja Praktis</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
            Dari setup awal sampai transaksi pertama dalam 3 menit.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Tidak ada form rumit untuk kasir, tidak perlu hardware kasir mahal.
            Cukup gunakan perangkat smartphone yang sudah dimiliki staf Anda.
          </p>
        </div>

        {/* Step Selector Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`text-left p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isActive
                    ? "bg-surface border-primary shadow-sm"
                    : "bg-surface/50 border-border hover:bg-surface hover:border-border/80 text-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isActive ? "text-primary" : "text-muted"
                    }`}
                  >
                    {step.num}
                  </span>
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? "text-primary" : "text-muted"
                    }`}
                  />
                </div>
                <div
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isActive ? "text-foreground" : "text-muted"
                  }`}
                >
                  {step.shortTitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Step Explanation (Col 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono bg-surface-hover border border-border text-muted">
                <span>Langkah {steps[activeStep].num} dari 04</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {steps[activeStep].title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {steps[activeStep].desc}
              </p>

              <div className="pt-2 flex items-center gap-2 text-xs font-mono text-muted">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Terverifikasi & terisolasi per tenant</span>
              </div>

              {/* Step Navigation Dots */}
              <div className="pt-4 flex items-center gap-2">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeStep === i
                        ? "w-8 bg-primary"
                        : "w-2 bg-border hover:bg-muted"
                    }`}
                    aria-label={`Pindah ke langkah ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Visual Interactive Preview (Col 7) */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border border-border bg-background p-4 sm:p-6 shadow-inner font-sans overflow-hidden">
                <div key={activeStep} className="animate-step-in">
                {activeStep === 0 && (
                  /* Step 1: Telegram Pairing preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          @OXIDLedgerBot (Telegram)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[11px]">
                        Online
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-fg px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[80%] font-mono">
                          /pair OXID-7842
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="bg-surface border border-border p-3.5 rounded-2xl rounded-tl-sm max-w-[90%] space-y-2 text-foreground">
                          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Bot Berhasil Terhubung!</span>
                          </div>
                          <p className="text-muted leading-relaxed">
                            Kanal Telegram ini telah tertaut ke toko:{" "}
                            <span className="font-semibold text-foreground">
                              Berkah Pangan Nusantara
                            </span>
                            . Operator sekarang dapat langsung mengirim format
                            transaksi.
                          </p>
                          <div className="text-[10px] font-mono text-muted border-t border-border pt-1.5">
                            Status: AKTIF • Pairing ID: #7842
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  /* Step 2: Master Product & Alias preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          Master Produk & Kamus Alias
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        2 Produk Terdaftar
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">
                            Ikan Lele Segar
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            Rp 26.000 / kg
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="text-muted">Alias kasir:</span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            lele
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            ll
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            ikan-lele
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">
                            Ayam Potong Broiler
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            Rp 34.000 / ekor
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="text-muted">Alias kasir:</span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            ayam
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            ap
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover border border-border font-mono text-foreground">
                            broiler
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  /* Step 3: Fast Recording Chat preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          Simulasi Percakapan Kasir
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-muted">
                        Parsing Deterministik
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-end">
                        <div className="bg-primary text-primary-fg px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[80%] font-mono">
                          lele 5kg 26rb tunai
                        </div>
                      </div>

                      <div className="flex justify-start">
                        <div className="bg-surface border border-border p-3.5 rounded-2xl rounded-tl-sm max-w-[90%] space-y-2 text-foreground">
                          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Transaksi Berhasil Dibukukan</span>
                          </div>
                          <div className="bg-background/80 p-2.5 rounded-md border border-border font-mono text-[11px] space-y-1">
                            <div className="flex justify-between text-muted">
                              <span>Produk:</span>
                              <span className="text-foreground font-semibold">
                                Ikan Lele Segar
                              </span>
                            </div>
                            <div className="flex justify-between text-muted">
                              <span>Kuantitas:</span>
                              <span className="text-foreground">5 kg</span>
                            </div>
                            <div className="flex justify-between text-muted">
                              <span>Harga Satuan:</span>
                              <span className="text-foreground">Rp 26.000</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-border font-bold text-foreground">
                              <span>Total Omzet:</span>
                              <span className="text-emerald-500">
                                Rp 130.000 (Tunai)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  /* Step 4: Real-time Ledger & Sheet Mirror preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                        <span className="font-semibold text-foreground">
                          Cermin Google Sheets (1-Arah)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[11px]">
                        Tersinkron Otomatis
                      </span>
                    </div>

                    <div className="overflow-x-auto text-[11px] font-mono">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border text-muted bg-surface/50">
                            <th className="py-1.5 px-2">Waktu</th>
                            <th className="py-1.5 px-2">Produk</th>
                            <th className="py-1.5 px-2">Qty</th>
                            <th className="py-1.5 px-2">Total</th>
                            <th className="py-1.5 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr className="bg-emerald-500/5">
                            <td className="py-1.5 px-2 text-muted">14:32:05</td>
                            <td className="py-1.5 px-2 font-medium text-foreground">
                              Ikan Lele Segar
                            </td>
                            <td className="py-1.5 px-2">5 kg</td>
                            <td className="py-1.5 px-2 text-emerald-500 font-bold">
                              Rp 130.000
                            </td>
                            <td className="py-1.5 px-2 text-emerald-500">
                              Tersinkron
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 text-muted">13:15:20</td>
                            <td className="py-1.5 px-2 font-medium text-foreground">
                              Ayam Potong
                            </td>
                            <td className="py-1.5 px-2">2 ekor</td>
                            <td className="py-1.5 px-2 text-foreground font-semibold">
                              Rp 68.000
                            </td>
                            <td className="py-1.5 px-2 text-emerald-500">
                              Tersinkron
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface border border-border flex items-center justify-between text-xs text-muted">
                      <span>Integritas data terlindungi:</span>
                      <span className="font-semibold text-foreground">
                        PostgreSQL ACID Ledger
                      </span>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
