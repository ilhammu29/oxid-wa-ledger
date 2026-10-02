"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  q: string;
  a: string;
}

const FAQS: FAQItem[] = [
  {
    q: "Apakah staf atau kasir harus menginstal aplikasi baru?",
    a: "Sama sekali tidak perlu. Anda dan staf kasir cukup menggunakan aplikasi Telegram yang sudah terpasang di smartphone. Cukup kirim chat ke bot Telegram usaha Anda seperti berkirim pesan biasa.",
  },
  {
    q: "Bagaimana jika ada nama produk yang disingkat atau berbeda sebutan?",
    a: "OXID Ledger dilengkapi fitur Alias Produk Cerdas. Anda dapat mendaftarkan berbagai sebutan atau singkatan produk (contoh: 'lele', 'ikan lele', 'lele konsumsi', 'LL-1') ke satu master produk, sehingga mesin pencatat langsung mengenalinya secara akurat.",
  },
  {
    q: "Apakah transaksi yang keliru ketik bisa dibatalkan atau diedit?",
    a: "Bisa. Anda atau operator berwenang dapat membatalkan transaksi langsung dari chat Telegram atau mengelola dan membatalkannya melalui halaman Transaksi di dashboard web.",
  },
  {
    q: "Apakah wajib menghubungkan akun Google Sheets?",
    a: "Tidak wajib. Google Sheets adalah fitur pelengkap (cermin data) satu arah. Seluruh data transaksi, ringkasan harian, dan analitik sudah tersimpan aman dan dapat dipantau langsung di dashboard web OXID Ledger.",
  },
  {
    q: "Bagaimana sistem pembayaran setelah masa uji coba 14 hari?",
    a: "Masa uji coba 14 hari bersifat gratis tanpa perlu memasukkan kartu kredit. Setelah masa uji coba selesai, data Anda tetap aman tersimpan. Anda dapat memperpanjang paket Basic atau Pro melalui transfer bank manual yang diverifikasi oleh sistem kami.",
  },
  {
    q: "Apakah data transaksi saya aman dan tidak tercampur usaha lain?",
    a: "Sangat aman. OXID Ledger dibangun dengan standar keamanan Multi-Tenant Row Level Security (RLS) pada PostgreSQL. Setiap bisnis memiliki ruang data yang terisolasi secara kriptografis dan tidak dapat diakses oleh bisnis lain.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className={`border rounded-xl transition-all duration-200 overflow-hidden ${
              isOpen
                ? "bg-surface border-primary/40 shadow-xs"
                : "bg-surface/60 border-border hover:border-border-subtle hover:bg-surface"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <HelpCircle
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isOpen ? "text-primary" : "text-muted"
                  }`}
                />
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  {faq.q}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-primary" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-5 pb-4 pt-1 text-xs text-muted leading-relaxed border-t border-border/50">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
