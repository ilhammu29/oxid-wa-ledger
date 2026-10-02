"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  num: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-telegram-choice",
    num: "01",
    question: "Mengapa menggunakan Telegram untuk kasir dan bukan aplikasi POS biasa?",
    answer:
      "Aplikasi POS tablet atau mobile seringkali lambat, memakan memori ponsel, dan rentan crash saat sinyal pasar sedang lemah. Telegram sangat ringan, sudah familiar bagi staf kasir, stabil di koneksi 3G/EDGE sekalipun, dan tidak membebani pemilik dengan biaya pembelian tablet baru.",
  },
  {
    id: "faq-sheets-sync",
    num: "02",
    question: "Bagaimana cara sinkronisasi dengan Google Sheets bekerja?",
    answer:
      "Setelah Anda menghubungkan akun Google Anda di konsol OXID Ledger, sistem kami akan membuatkan lembar kerja dengan format buku kas rapi. Setiap kali kasir memasukkan transaksi via Telegram, baris baru akan langsung ditambahkan ke spreadsheet tersebut dalam hitungan detik.",
  },
  {
    id: "faq-training-staff",
    num: "03",
    question: "Apakah kasir dan karyawan saya perlu ditraining secara khusus?",
    answer:
      "Tidak perlu kursus rumit. Kasir cukup mengetik kalimat natural seperti biasa mereka mencatat di buku nota, misalnya: 'Lele 5kg @28rb tunai' atau 'Beli es 2 balok 30rb'. Sistem parser OXID Ledger otomatis membaca jumlah, nama produk di katalog, dan metode pembayaran.",
  },
  {
    id: "faq-wrong-input",
    num: "04",
    question: "Bagaimana jika kasir salah mengetik harga atau kuantitas transaksi?",
    answer:
      "Kasir dapat mengirim perintah koreksi atau pembatalan transaksi langsung dari chat, atau admin dapat merevisi/void nota tersebut melalui web dashboard. Setiap pembatalan dicatat rapi sebagai jurnal pembalik sehingga arus kas tetap transparan dan tidak ada manipulasi.",
  },
  {
    id: "faq-offline-or-slow",
    num: "05",
    question: "Bagaimana jika toko tiba-tiba kehilangan koneksi internet?",
    answer:
      "Kasir tetap bisa mengetik pesan di aplikasi Telegram mereka. Begitu sinyal ponsel kasir tersambung kembali, seluruh antrean pesan akan langsung terkirim dan diproses secara berurutan sesuai urutan waktu pengiriman.",
  },
  {
    id: "faq-data-security",
    num: "06",
    question: "Apakah data keuangan dan transaksi bisnis saya aman?",
    answer:
      "Sangat aman. Basis data OXID Ledger menggunakan arsitektur PostgreSQL dengan isolasi tingkat baris (Row-Level Security / RLS). Hanya akun terdaftar milik bisnis Anda yang memiliki akses membaca dan mengubah catatan pembukuan tersebut.",
  },
];

export function LedgerFaq() {
  const [openId, setOpenId] = useState<string>("faq-telegram-choice");

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? "" : id));
  };

  return (
    <section id="faq" className="py-16 sm:py-24 border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-md border border-border bg-surface text-[11px] font-mono font-medium text-foreground tracking-wide">
              PERTANYAAN UMUM
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-sans">
            Semua yang perlu Anda ketahui sebelum memulai.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed">
            Jawaban lugas seputar alur operasional, keamanan data, dan cara kerja
            pembukuan kasir chat-to-ledger.
          </p>
        </div>

        {/* Ruled Accordion List */}
        <div className="border-t border-border divide-y divide-border">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="py-4 sm:py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-4 text-left group cursor-pointer"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className="font-mono text-xs font-semibold text-muted/60 mt-1 shrink-0">
                      {faq.num}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {faq.question}
                    </span>
                  </div>

                  <span
                    className={`p-1 rounded-md border border-border bg-surface text-muted transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3 pl-7 sm:pl-9 pr-4 text-xs sm:text-sm text-muted leading-relaxed">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
