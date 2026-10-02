"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-why-telegram",
    question: "Mengapa menggunakan Telegram untuk mencatat penjualan kasir?",
    answer:
      "Aplikasi kasir tablet konvensional seringkali lambat, memakan memori ponsel kasir, dan sering terputus saat sinyal di pasar sedang lemah. Telegram sangat ringan, sudah familiar bagi staf toko, stabil di jaringan 3G sekalipun, dan pemilik tidak perlu membeli tablet atau printer kasir baru.",
  },
  {
    id: "faq-how-sheets",
    question: "Bagaimana cara kerja sinkronisasi ke Google Sheets?",
    answer:
      "Saat toko terhubung dengan Google Sheets di dashboard OXID, sistem otomatis membuatkan lembar kerja buku kas yang rapi. Setiap kali kasir memasukkan transaksi via Telegram, baris baru langsung ditambahkan ke spreadsheet tersebut dalam hitungan detik.",
  },
  {
    id: "faq-training-staff",
    question: "Apakah kasir dan karyawan perlu ditraining secara khusus?",
    answer:
      "Tidak perlu training rumit. Kasir cukup mengetik pesan santai seperti biasa mereka menulis di nota manual, misalnya: 'Lele 5kg @28rb tunai' atau 'Beli es balok 20rb'. Asisten bot OXID otomatis membaca harga, produk di katalog, dan metode pembayaran.",
  },
  {
    id: "faq-typo-mistake",
    question: "Bagaimana jika kasir salah mengetik harga atau kuantitas barang?",
    answer:
      "Kasir dapat mengirim pesan koreksi atau pembatalan transaksi langsung dari chat Telegram, atau admin dapat merevisi/void nota tersebut melalui web dashboard. Semua koreksi tercatat transparan dan tidak ada manipulasi.",
  },
  {
    id: "faq-poor-signal",
    question: "Bagaimana jika koneksi internet toko sedang tidak stabil?",
    answer:
      "Kasir tetap bisa mengetik pesan di aplikasi Telegram mereka. Begitu sinyal ponsel kasir tersambung kembali, seluruh antrean pesan akan langsung terkirim dan diproses secara berurutan sesuai urutan waktu pengiriman.",
  },
  {
    id: "faq-data-safety",
    question: "Apakah data keuangan dan transaksi usaha saya aman?",
    answer:
      "Sangat aman. Setiap akun bisnis di OXID Ledger memiliki ruang data terisolasi yang aman dan terlindungi enkripsi. Hanya Anda dan operator resmi toko Anda yang dapat mengakses catatan pembukuan tersebut.",
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string>("faq-why-telegram");

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? "" : id));
  };

  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-xs font-medium text-foreground mb-4">
            <span>PERTANYAAN UMUM</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Semua yang sering ditanyakan.
          </h2>
          <p className="mt-3 text-base text-muted leading-relaxed">
            Jawaban seputar alur operasional, keamanan data, dan kemudahan pencatatan.
          </p>
        </div>

        {/* Clean Divided FAQ List */}
        <div className="border-t border-border divide-y divide-border">
          {FAQS.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className="py-5 sm:py-6">
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-start justify-between gap-4 text-left group cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {faq.question}
                  </span>
                  <span
                    className={`p-1.5 rounded-lg border border-border bg-surface text-muted transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3 pr-8 text-sm text-muted leading-relaxed">
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
