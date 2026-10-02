"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "Apakah operator atau kasir wajib menginstal aplikasi khusus?",
    a: "Sama sekali tidak perlu. Anda dan staf kasir cukup menggunakan aplikasi Telegram yang sudah terpasang di smartphone masing-masing. Staf cukup mengirimkan pesan transaksi ke bot Telegram usaha Anda sebagaimana mengirim chat biasa.",
  },
  {
    q: "Mengapa Google Sheets dijadikan cermin (mirror), bukan database utama?",
    a: "Google Sheets sangat rentan rusak jika dijadikan database utama yang diedit banyak staf (rumus tertimpa, baris terhapus, selisih koma). Di OXID Ledger, database utama menggunakan PostgreSQL ACID yang aman dan terisolasi. Google Sheets menerima cermin data satu arah secara instan, sehingga Anda tetap leluasa melakukan analisis data tanpa merusak catatan kas.",
  },
  {
    q: "Bagaimana mesin mengenali singkatan nama produk kasir?",
    a: "OXID Ledger memiliki fitur Kamus Alias Master Produk. Anda dapat mendaftarkan beberapa sebutan kasir (misal: 'lele', 'ikan-l', 'LL-1') untuk produk yang sama. Mesin pencatat deterministik kami mencocokkan alias secara langsung tanpa ketergantungan pada model AI yang rawan halusinasi angka.",
  },
  {
    q: "Apakah data transaksi aman dan terisolasi antar toko?",
    a: "Sangat aman. Seluruh data transaksi, produk, dan laporan dilindungi oleh Row-Level Security (RLS) PostgreSQL setingkat perbankan. Akses data dibatasi ketat hanya untuk akun dan staf yang terdaftar di bisnis Anda.",
  },
  {
    q: "Bagaimana masa percobaan (trial) 14 hari bekerja?",
    a: "Saat mendaftar, Anda langsung mendapatkan Paket Pilot gratis selama 14 hari dengan fitur penuh. Tidak perlu memasukkan kartu kredit. Setelah 14 hari, data Anda tetap tersimpan utuh dan Anda dapat memilih untuk berlangganan paket Basic atau Pro via transfer bank / QRIS.",
  },
  {
    q: "Mengapa saat ini fokus pada Telegram dan bagaimana status WhatsApp?",
    a: "Telegram menyediakan API bot resmi yang stabil, bebas blokir akun personal, dan berlatensi sangat rendah (<800ms). Dukungan WhatsApp resmi sedang dalam tahap finalisasi kepatuhan Meta Business dan akan tersedia tanpa mengubah format alur pencatatan Anda.",
  },
];

import { ScrollReveal } from "./scroll-reveal";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/20 mb-3">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Pertanyaan Umum</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Hal yang sering ditanyakan.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
              Penjelasan transparan seputar cara kerja, keandalan teknis, dan
              keamanan data bisnis Anda.
            </p>
          </div>

          {/* Accordion List with Smooth Height & Opacity Transition */}
          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-surface border-primary/40 shadow-sm"
                      : "bg-surface/50 border-border hover:border-border/90 hover:bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-foreground">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-200 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/50">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
